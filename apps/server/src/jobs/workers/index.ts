import { Worker } from 'bullmq';

import { AppError } from '../../errors/AppError.js';
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
    const { minutesId, meetingId, roomId } = job.data as {
      minutesId: string;
      meetingId: string;
      roomId: string;
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
      throw new AppError('MEETING_NOT_FOUND');
    }

    // 미팅이 아직 진행 중일 경우를 대비해 종료 시간이 없으면 현재 시간을 기준점으로 잡습니다.
    const startTime = meeting.startedAt;
    const endTime = meeting.endedAt || new Date();

    const chatMessages = await prisma.chatMessage.findMany({
      where: {
        roomId,
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
      throw new AppError('BAD_REQUEST');
    }

    // Anthropic 서비스 함수 호출하여 마크다운 추출
    const { contentMd, actionItems } =
      await generateMinutesSummary(chatMessages);

    const currentMinutes = await prisma.minutes.findUnique({
      where: { id: minutesId },
    });
    const isAutoGenerating =
      currentMinutes?.title.includes('생성하고 있습니다') ?? false;

    const finalTitle = isAutoGenerating
      ? 'AI 자동 생성 회의록'
      : (currentMinutes?.title ?? 'AI 자동 생성 회의록');

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

  // 실패 시 유저가 재시도할 수 있도록 상태를 다시 draft로 안전하게 복구
  if (job?.data?.minutesId !== undefined && job?.data?.minutesId !== null) {
    await prisma.minutes
      .update({
        where: { id: job.data.minutesId as string },
        data: { status: 'draft' },
      })
      .catch(() => {});
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
