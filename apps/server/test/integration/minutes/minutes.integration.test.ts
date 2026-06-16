/*
 * [영역 8] 회의록 생성 플로우 (HTTP 통합)
 * - 수동 생성(POST /minutes) → 201 draft
 * - AI 생성 요청(POST /minutes/generate) → 202 generating + 백그라운드 작업 큐 등록
 * - 같은 회의 재요청(생성 중) → 409 MINUTES_GENERATING
 * - 확정본 존재 시 재요청 → 409 MINUTES_ALREADY_EXISTS
 * - 수정(PATCH /minutes/:id) → 200
 *
 * BullMQ(addJob)는 setup 에서 모킹되어 실제 Redis 없이 동작한다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addJob } from '@/jobs/queues/index.js';
import { prisma } from '@/lib/prisma.js';

import { createUserWithToken, request, seedRoom } from '../app-harness.js';

describe('회의록 생성 플로우 (integration)', () => {
  let auth: string;
  let userId: string;
  let roomId: string;
  let meetingId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const host = await createUserWithToken();
    const room = await seedRoom(host.id);
    auth = host.auth;
    userId = host.id;
    roomId = room.roomId;

    const meeting = await prisma.meeting.create({
      data: {
        roomId,
        privateRoomId: room.privateRoomIds[0],
        hostId: userId,
        status: 'ended',
        endedAt: new Date(),
      },
    });
    meetingId = meeting.id;
  });

  it('수동 회의록 생성 → 201 draft', async () => {
    const res = await request()
      .post(`/api/rooms/${roomId}/minutes`)
      .set('Authorization', auth)
      .send({ title: '스프린트 회고', type: 'meeting', content_md: '# 회고' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: '스프린트 회고',
      type: 'meeting',
      status: 'draft',
    });
  });

  it('AI 생성 요청 → 202 generating + 큐 등록', async () => {
    const res = await request()
      .post(`/api/rooms/${roomId}/minutes/generate`)
      .set('Authorization', auth)
      .send({ meeting_id: meetingId, title: '회의록' });

    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('generating');
    expect(res.body.data.meeting_id).toBe(meetingId);
    expect(addJob).toHaveBeenCalledWith(
      'minutes-generation',
      expect.objectContaining({ meetingId, roomId }),
    );
  });

  it('생성 중 같은 회의 재요청 → 409 MINUTES_GENERATING', async () => {
    const first = await request()
      .post(`/api/rooms/${roomId}/minutes/generate`)
      .set('Authorization', auth)
      .send({ meeting_id: meetingId });
    expect(first.status).toBe(202);

    const second = await request()
      .post(`/api/rooms/${roomId}/minutes/generate`)
      .set('Authorization', auth)
      .send({ meeting_id: meetingId });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe('MINUTES_GENERATING');
  });

  it('확정본이 있으면 재요청 → 409 MINUTES_ALREADY_EXISTS', async () => {
    const gen = await request()
      .post(`/api/rooms/${roomId}/minutes/generate`)
      .set('Authorization', auth)
      .send({ meeting_id: meetingId });
    const minutesId = gen.body.data.id;

    // 워커 완료 후 확정된 상태를 직접 재현
    await prisma.minutes.update({
      where: { id: minutesId },
      data: { status: 'confirmed', contentMd: '확정된 회의록' },
    });

    const res = await request()
      .post(`/api/rooms/${roomId}/minutes/generate`)
      .set('Authorization', auth)
      .send({ meeting_id: meetingId });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MINUTES_ALREADY_EXISTS');
  });

  it('회의록 수정(PATCH) → 200, 내용/상태 반영', async () => {
    const created = await request()
      .post(`/api/rooms/${roomId}/minutes`)
      .set('Authorization', auth)
      .send({ title: '초안', type: 'etc' });
    const minutesId = created.body.data.id;

    const res = await request()
      .patch(`/api/rooms/${roomId}/minutes/${minutesId}`)
      .set('Authorization', auth)
      .send({ title: '수정본', content_md: '# 수정', status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: '수정본',
      status: 'confirmed',
    });
  });
});
