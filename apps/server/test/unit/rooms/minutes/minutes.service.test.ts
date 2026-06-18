/*
 * minutes.service triggerAiMinutesGeneration 유닛 테스트
 * - prisma(룸/회의/회의록)·addJob(큐)를 모킹해 DB·큐 없이 "재생성 경합 가드"를 검증
 * - 핵심(I34): draft→generating 원자적 전이. 경합으로 count=0 이면 잡을 enqueue 하지 않고 409.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { addJob } from '@/jobs/queues/index.js';
import { MinutesService } from '@/services/rooms/minutes/minutes.service.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    roomMember: { findFirst: vi.fn() },
    meeting: { findFirst: vi.fn() },
    minutes: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/jobs/queues/index.js', () => ({ addJob: vi.fn() }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enqueue = addJob as any;

const ROOM_ID = 'room-1';
const AUTHOR_ID = 'user-1';
const MEETING_ID = 'meeting-1';
const MINUTES_ID = 'minutes-1';

const service = new MinutesService();

// findUniqueOrThrow 가 돌려줄 전체 회의록 행
const generatingRow = {
  id: MINUTES_ID,
  meetingId: MEETING_ID,
  roomId: ROOM_ID,
  authorId: AUTHOR_ID,
  title: 'AI가 회의록을 생성하고 있습니다...',
  type: 'meeting',
  contentMd: null,
  status: 'generating',
  linkedIssueNumbers: [] as number[],
  actionItems: [],
  createdAt: new Date('2026-06-17T00:00:00.000Z'),
  updatedAt: new Date('2026-06-17T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
  db.meeting.findFirst.mockResolvedValue({ id: MEETING_ID });
});

describe('triggerAiMinutesGeneration - 재생성 경합 가드', () => {
  it('기존 draft 를 원자적으로 generating 전환하고 잡을 enqueue 한다', async () => {
    db.minutes.findUnique.mockResolvedValue({
      id: MINUTES_ID,
      status: 'draft',
      title: '초안',
    });
    db.minutes.updateMany.mockResolvedValue({ count: 1 }); // 전이 성공
    db.minutes.findUniqueOrThrow.mockResolvedValue(generatingRow);

    const result = await service.triggerAiMinutesGeneration(
      ROOM_ID,
      AUTHOR_ID,
      {
        meeting_id: MEETING_ID,
      },
    );

    // status 가드가 걸린 updateMany 로 전이
    expect(db.minutes.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: MINUTES_ID,
          status: { notIn: ['generating', 'confirmed'] },
        }),
        data: expect.objectContaining({ status: 'generating' }),
      }),
    );
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('generating');
  });

  it('경합에서 지면(count=0) 잡을 enqueue 하지 않고 MINUTES_GENERATING', async () => {
    db.minutes.findUnique.mockResolvedValue({
      id: MINUTES_ID,
      status: 'draft', // findUnique 시점엔 draft
      title: '초안',
    });
    db.minutes.updateMany.mockResolvedValue({ count: 0 }); // 그 사이 타 요청이 선점

    await expect(
      service.triggerAiMinutesGeneration(ROOM_ID, AUTHOR_ID, {
        meeting_id: MEETING_ID,
      }),
    ).rejects.toMatchObject({ code: 'MINUTES_GENERATING' });

    // 핵심: 중복 잡이 enqueue 되지 않는다
    expect(enqueue).not.toHaveBeenCalled();
    expect(db.minutes.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('이미 generating 이면 즉시 409 (updateMany 시도 없음)', async () => {
    db.minutes.findUnique.mockResolvedValue({
      id: MINUTES_ID,
      status: 'generating',
      title: '생성 중',
    });

    await expect(
      service.triggerAiMinutesGeneration(ROOM_ID, AUTHOR_ID, {
        meeting_id: MEETING_ID,
      }),
    ).rejects.toMatchObject({ code: 'MINUTES_GENERATING' });

    expect(db.minutes.updateMany).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('이미 confirmed 면 MINUTES_ALREADY_EXISTS', async () => {
    db.minutes.findUnique.mockResolvedValue({
      id: MINUTES_ID,
      status: 'confirmed',
      title: '확정본',
    });

    await expect(
      service.triggerAiMinutesGeneration(ROOM_ID, AUTHOR_ID, {
        meeting_id: MEETING_ID,
      }),
    ).rejects.toMatchObject({ code: 'MINUTES_ALREADY_EXISTS' });

    expect(enqueue).not.toHaveBeenCalled();
  });
});
