import { UnrecoverableError, Worker } from 'bullmq';

import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import {
  generateMinutesSummary,
  reviewCode,
} from '../../services/anthropic.service.js';
import {
  deleteExpiredPrivateRoomChats,
  PRIVATE_ROOM_CHAT_RETENTION_DAYS,
} from '../../services/chat-cleanup.service.js';
import { getIO } from '../../socket/index.js';
import { addJob } from '../queues/index.js';

const connection = redis;

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
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    if (chatMessages.length === 0) {
      // 수집된 대화가 없으면 재시도해도 동일하게 실패하므로 즉시 종료
      throw new UnrecoverableError('MINUTES_NO_CHAT_LOG');
    }

    // Anthropic 서비스 함수 호출하여 제목/본문/액션 아이템 추출
    const {
      title: aiTitle,
      contentMd,
      actionItems,
    } = await generateMinutesSummary(chatMessages);

    /*
     * 제목 우선순위: 사용자가 지정한 제목 > AI 생성 제목 > 고정 기본값.
     * 사용자가 제목을 줬는지는 잡 데이터(userTitle)로 명시적으로 판단한다.
     */
    const finalTitle =
      userTitle ?? (aiTitle !== '' ? aiTitle : 'AI 자동 생성 회의록');

    await prisma.minutes.update({
      where: { id: minutesId },
      data: {
        title: finalTitle,
        contentMd,
        actionItems,
        status: 'draft',
      },
    });

    // 소켓 이벤트 브로드캐스트
    getIO().to(roomId).emit('minutes:generated', {
      room_id: roomId,
      minutes_id: minutesId,
      meeting_id: meetingId,
      title: finalTitle,
      action_items: actionItems,
      status: 'draft',
    });

    return { success: true };
  },
  { connection },
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
  await prisma.minutes
    .update({
      where: { id: minutesId },
      data: { status: 'failed' },
    })
    .catch(() => {});

  if (roomId !== undefined) {
    getIO().to(roomId).emit('minutes:generation-failed', {
      room_id: roomId,
      minutes_id: minutesId,
      meeting_id: meetingId,
      status: 'failed',
    });
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

  console.log(
    `✅ BullMQ workers started (private-room chat retention: ${PRIVATE_ROOM_CHAT_RETENTION_DAYS}d)`,
  );
}
