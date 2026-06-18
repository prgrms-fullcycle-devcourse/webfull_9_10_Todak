import { UnrecoverableError, Worker } from 'bullmq';

import { Prisma } from '../../generated/prisma/client/index.js';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import {
  generateMinutesSummary,
  resolveActionItemAssignees,
  reviewCode,
} from '../../services/ai/anthropic.service.js';
import {
  deleteExpiredPrivateRoomChats,
  PRIVATE_ROOM_CHAT_RETENTION_DAYS,
} from '../../services/ai/chat-cleanup.service.js';
import {
  createNotifications,
  getMeetingParticipantIds,
} from '../../services/notifications/notifications.service.js';
import { filterChatNoise } from '../../services/rooms/minutes/minutes-input.js';
import { MinutesService } from '../../services/rooms/minutes/minutes.service.js';
import { getIO } from '../../socket/index.js';
import { addJob } from '../queues/index.js';

import { classifyMinutesFailReason } from './minutes-fail-reason.js';
import {
  buildDisplayNameMap,
  buildMeetingInfoHeader,
} from './minutes-header.js';

const connection = redis;

/*
 * 회의록 생성 잡은 Anthropic 호출 대기가 대부분인 I/O-bound 라 동시 처리로 처리량을 올린다.
 * 동시 처리 = 동시 Anthropic 호출(비용·레이트리밋) + 동시 DB 커넥션이라 보수적으로 설정.
 * DB 풀(pg 어댑터 기본 10)에 비해 여유 — 잡당 커넥션은 짧은 쿼리 구간만 점유하고
 * 대부분 시간은 Anthropic 대기라 커넥션을 들고 있지 않음.
 * (chat-cleanup·minutes-sweep 은 주기적 단일 잡, ai-review 는 미사용이라 동시성 설정 불필요)
 */
const MINUTES_GENERATION_CONCURRENCY = 3;

export const aiReviewWorker = new Worker(
  'ai-review',
  async job => {
    const { code, context } = job.data as { code: string; context?: string };
    console.log(`[Worker] ai-review job ${job.id} started`);
    const result = await reviewCode(code, context);

    return { result };
  },
  { connection },
);

export const minutesGenerationWorker = new Worker(
  'minutes-generation',
  async job => {
    const { minutesId, meetingId, roomId, userTitle } = job.data as {
      minutesId: string;
      meetingId: string;
      roomId: string;
      userTitle: string | null;
    };
    console.log(`[Worker] minutes-generation job ${job.id} started`);

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { host: { select: { githubUsername: true } } },
    });

    if (
      !meeting ||
      meeting.startedAt === null ||
      meeting.startedAt === undefined
    ) {
      // 회의가 없거나 시작 시간이 없으면 재시도해도 동일하게 실패하므로 즉시 종료
      throw new UnrecoverableError('MEETING_NOT_FOUND');
    }

    // 미팅이 아직 진행 중일 경우를 대비해 종료 시간이 없으면 현재 시간을 기준점으로 잡습니다.
    const startTime = meeting.startedAt;
    const endTime = meeting.endedAt || new Date();

    /*
     * 회의는 프라이빗 룸에서 진행되므로, 메인룸/다른 프라이빗룸 채팅이 섞이지 않도록
     * 이 회의의 privateRoomId로 한정해 대화 로그를 수집한다.
     */
    const chatMessages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        privateRoomId: meeting.privateRoomId,
        type: 'text',
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      // 작성자는 githubUsername 만 사용 — accessToken 등 민감 컬럼 미조회
      include: { user: { select: { githubUsername: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // 노이즈(빈 내용·이모지/기호만) 제거 — 입력 토큰·비용 절감
    const meaningfulChats = filterChatNoise(chatMessages);

    if (meaningfulChats.length === 0) {
      // 수집된(의미 있는) 대화가 없으면 재시도해도 동일하게 실패하므로 즉시 종료
      throw new UnrecoverableError('MINUTES_NO_CHAT_LOG');
    }

    /*
     * 담당자 추론 후보는 룸 멤버 전체(회의 미참여 멤버도 지목될 수 있음).
     * AI 에 명단을 주고, AI 가 지목한 github_username 을 룸 멤버로 매핑한다.
     */
    const members = await prisma.roomMember.findMany({
      where: { roomId },
      select: {
        nickname: true,
        user: { select: { id: true, githubUsername: true, avatarUrl: true } },
      },
    });

    // Anthropic 서비스 함수 호출하여 제목/본문/액션 아이템 추출
    const {
      title: aiTitle,
      contentMd: aiContentMd,
      actionItems,
    } = await generateMinutesSummary(
      meaningfulChats,
      members.map(m => ({
        githubUsername: m.user.githubUsername,
        nickname: m.nickname,
      })),
    );

    /*
     * '회의 정보' 헤더는 AI 추측이 아니라 DB 사실로 채운다(진행자/일시/참석자).
     * 표시명은 룸 nickname 우선(없으면 githubUsername), 닉네임 중복 시 username 병기.
     * 진행자는 룸을 떠났어도 host 의 githubUsername 으로 폴백한다.
     * (참석자 중 룸을 떠난 사람은 명단에서 생략)
     */
    const displayNameByUserId = buildDisplayNameMap(
      members.map(m => ({
        id: m.user.id,
        nickname: m.nickname,
        githubUsername: m.user.githubUsername,
      })),
    );
    const participantIds = await getMeetingParticipantIds(meetingId);
    const hostName =
      displayNameByUserId.get(meeting.hostId) ?? meeting.host.githubUsername;
    const attendeeNames = participantIds
      .map(id => displayNameByUserId.get(id))
      .filter((name): name is string => name !== undefined);

    // 백엔드가 만든 사실 헤더 + AI 가 만든 논의/결정 본문
    const contentMd = `${buildMeetingInfoHeader(
      startTime,
      hostName,
      attendeeNames,
    )}\n\n${aiContentMd}`;

    // AI 가 지목한 담당자 github_username → 룸 멤버 User 로 매핑(없으면 null)
    const resolvedActionItems = resolveActionItemAssignees(
      actionItems,
      members.map(m => ({
        id: m.user.id,
        githubUsername: m.user.githubUsername,
        avatarUrl: m.user.avatarUrl,
      })),
    );

    /*
     * 제목 우선순위: 사용자가 지정한 제목 > AI 생성 제목 > 고정 기본값.
     * 사용자가 제목을 줬는지는 잡 데이터(userTitle)로 명시적으로 판단한다.
     */
    const finalTitle =
      userTitle ?? (aiTitle !== '' ? aiTitle : 'AI 자동 생성 회의록');

    const updatedMinutes = await prisma.minutes.update({
      where: { id: minutesId },
      data: {
        title: finalTitle,
        contentMd,
        actionItems: resolvedActionItems as unknown as Prisma.InputJsonValue,
        status: 'draft',
      },
    });

    // 소켓 이벤트 브로드캐스트
    getIO().to(roomId).emit('minutes:generated', {
      room_id: roomId,
      minutes_id: minutesId,
      meeting_id: meetingId,
      title: finalTitle,
      action_items: resolvedActionItems,
      status: 'draft',
    });

    /*
     * 알림(영속): 회의 참여자에게만(룸 전체 X). 생성 요청 작성자는 제외.
     * participantIds 는 위 헤더 조립에서 이미 조회됨(재사용).
     */
    await createNotifications(
      participantIds.filter(id => id !== updatedMinutes.authorId),
      {
        roomId,
        type: 'minutes_generated',
        message: `회의록 생성 완료: ${finalTitle}`,
        link: `/room/${roomId}`,
      },
    );

    return { success: true };
  },
  { connection, concurrency: MINUTES_GENERATION_CONCURRENCY },
);

aiReviewWorker.on('completed', job => {
  console.log(`[Worker] ai-review job ${job.id} completed`);
});

aiReviewWorker.on('failed', (job, err) => {
  console.error(`[Worker] ai-review job ${job?.id} failed:`, err.message);
});

minutesGenerationWorker.on('completed', job => {
  console.log(`[Worker] minutes-generation job ${job.id} completed`);
});

minutesGenerationWorker.on('failed', async (job, err) => {
  console.error(
    `[Worker] minutes-generation job ${job?.id} failed:`,
    err.message,
  );

  if (job === undefined) {
    return;
  }

  /*
   * BullMQ는 시도마다 'failed'를 발생시키므로 최종 실패에서만 정리한다.
   * UnrecoverableError는 재시도 없이 즉시 종료되므로(attemptsMade가 maxAttempts에
   * 도달하지 않음) 별도로 최종 실패로 간주한다. 그 외 일시적 실패는 모든 재시도가
   * 소진됐을 때만 정리한다. (중간 재시도 중에는 상태를 건드리지 않음)
   */
  const maxAttempts = job.opts.attempts ?? 1;
  const isUnrecoverable = err.name === 'UnrecoverableError';
  if (!isUnrecoverable && job.attemptsMade < maxAttempts) {
    return;
  }

  const { minutesId, roomId, meetingId } = job.data as {
    minutesId?: string;
    roomId?: string;
    meetingId?: string;
  };

  if (minutesId === undefined) {
    return;
  }

  /*
   * 빈 본문 + "생성 중" 제목인 회의록이 draft로 남으면 사용자가 혼란스러우므로
   * 'failed' 상태로 표시해 재시도 UI를 띄울 수 있게 한다.
   */
  const failedMinutes = await prisma.minutes
    .update({
      where: { id: minutesId },
      data: { status: 'failed' },
    })
    .catch(() => null);

  const reason = classifyMinutesFailReason(err);

  if (roomId !== undefined) {
    getIO().to(roomId).emit('minutes:generation-failed', {
      room_id: roomId,
      minutes_id: minutesId,
      meeting_id: meetingId,
      status: 'failed',
      reason,
    });

    /*
     * 알림(영속): 생성 실패는 재시도해야 하므로 작성자(생성 API 호출자) 본인에게만.
     */
    if (failedMinutes !== null) {
      await createNotifications([failedMinutes.authorId], {
        roomId,
        type: 'minutes_generation_failed',
        message: '회의록 생성에 실패했습니다. 다시 시도해주세요.',
        link: `/room/${roomId}`,
      });
    }
  }
});

export const chatCleanupWorker = new Worker(
  'chat-cleanup',
  async () => {
    const deleted = await deleteExpiredPrivateRoomChats();
    console.log(
      `[Worker] chat-cleanup removed ${deleted} expired private-room messages`,
    );

    return { deleted };
  },
  { connection },
);

chatCleanupWorker.on('failed', (job, err) => {
  console.error(`[Worker] chat-cleanup job ${job?.id} failed:`, err.message);
});

/*
 * stuck-generating sweeper: 워커 크래시·재배포 등으로 'generating' 상태가 영구히 남은
 * 회의록을 주기적으로 failed 로 정리한다. in-process failed 핸들러가 닿지 못한 경우
 * (프로세스 사망)의 안전망. 정리된 건은 일반 생성 실패와 동일하게
 * 소켓(reason=GENERATION_ERROR) + 작성자 알림을 보낸다.
 */
const minutesService = new MinutesService();

export const minutesSweepWorker = new Worker(
  'minutes-sweep',
  async () => {
    const swept = await minutesService.sweepStuckGeneratingMinutes();

    for (const m of swept) {
      getIO()
        .to(m.roomId)
        .emit('minutes:generation-failed', {
          room_id: m.roomId,
          minutes_id: m.id,
          meeting_id: m.meetingId ?? undefined,
          status: 'failed',
          reason: 'GENERATION_ERROR',
        });

      await createNotifications([m.authorId], {
        roomId: m.roomId,
        type: 'minutes_generation_failed',
        message: '회의록 생성에 실패했습니다. 다시 시도해주세요.',
        link: `/room/${m.roomId}`,
      });
    }

    return { swept: swept.length };
  },
  { connection },
);

minutesSweepWorker.on('failed', (job, err) => {
  console.error(`[Worker] minutes-sweep job ${job?.id} failed:`, err.message);
});

const workers = [
  aiReviewWorker,
  minutesGenerationWorker,
  chatCleanupWorker,
  minutesSweepWorker,
];

/*
 * 그레이스풀 셧다운 시 호출한다.
 * worker.close()는 현재 처리 중인 잡이 끝날 때까지 기다린 뒤 새 잡 수신을 멈춘다.
 */
export async function closeWorkers() {
  await Promise.all(workers.map(worker => worker.close()));
  console.log('✅ BullMQ workers closed');
}

export async function startWorkers() {
  // 매일 자정(KST) 프라이빗 룸 채팅 정리 반복 잡 등록 (동일 설정이면 BullMQ가 중복 방지)
  await addJob(
    'chat-cleanup',
    {},
    {
      repeat: { pattern: '0 0 * * *', tz: 'Asia/Seoul' },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );

  // 5분마다 죽은 'generating' 회의록 정리 반복 잡 등록 (동일 설정이면 BullMQ가 중복 방지)
  await addJob(
    'minutes-sweep',
    {},
    {
      repeat: { pattern: '*/5 * * * *' },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );

  console.log(
    `✅ BullMQ workers started (private-room chat retention: ${PRIVATE_ROOM_CHAT_RETENTION_DAYS}d)`,
  );
}
