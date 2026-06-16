/*
 * [영역 7] 채팅 히스토리 페이지네이션 (HTTP 통합)
 * - before/limit 커서로 최신순(DESC) 반환
 * - 메인룸 히스토리에는 회의 시스템 메시지(meeting_start/end)가 포함되지 않는다
 *   (시스템 메시지는 프라이빗룸 소속이라 private_room_id IS NULL 필터에서 빠짐)
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma.js';

import { createUserWithToken, request, seedRoom } from '../../app-harness.js';

describe('채팅 히스토리 페이지네이션 (integration)', () => {
  let auth: string;
  let roomId: string;
  let userId: string;
  let privateRoomId: string;
  const base = new Date('2026-01-01T00:00:00.000Z').getTime();

  beforeEach(async () => {
    const host = await createUserWithToken();
    const room = await seedRoom(host.id);
    auth = host.auth;
    userId = host.id;
    roomId = room.roomId;
    privateRoomId = room.privateRoomIds[0];

    // 메인룸 메시지 3건 (t1 < t2 < t3)
    await prisma.chatMessage.createMany({
      data: [0, 1, 2].map(i => ({
        roomId,
        privateRoomId: null,
        userId,
        content: `msg-${i}`,
        type: 'text',
        createdAt: new Date(base + i * 1000),
      })),
    });
    // 프라이빗룸의 시스템 메시지 (메인룸 히스토리엔 안 나와야 함)
    await prisma.chatMessage.create({
      data: {
        roomId,
        privateRoomId,
        userId,
        content: null,
        type: 'meeting_start',
        createdAt: new Date(base + 5000),
      },
    });
  });

  it('limit 으로 최신 N개를 DESC 로 반환', async () => {
    const res = await request()
      .get(`/api/rooms/${roomId}/chats`)
      .query({ limit: 2 })
      .set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.map((m: { content: string }) => m.content)).toEqual([
      'msg-2',
      'msg-1',
    ]);
  });

  it('before 커서로 그 이전 메시지만 반환', async () => {
    const res = await request()
      .get(`/api/rooms/${roomId}/chats`)
      .query({ before: new Date(base + 1000).toISOString(), limit: 50 })
      .set('Authorization', auth);

    expect(res.status).toBe(200);
    // base+1000(=msg-1) "미만"이므로 msg-0 만
    expect(res.body.map((m: { content: string }) => m.content)).toEqual([
      'msg-0',
    ]);
  });

  it('메인룸 히스토리에는 시스템 메시지가 포함되지 않는다', async () => {
    const res = await request()
      .get(`/api/rooms/${roomId}/chats`)
      .query({ limit: 50 })
      .set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.every((m: { type: string }) => m.type === 'text')).toBe(
      true,
    );
  });
});
