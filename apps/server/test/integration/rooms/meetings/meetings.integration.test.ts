/*
 * [영역 3] 회의 라이프사이클 (HTTP 통합)
 * 시작 → 목록(ongoing) → 멱등 재시작 → 종료(ended, message_count) → 구간 채팅 조회
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma.js';

import { createUserWithToken, request, seedRoom } from '../../app-harness.js';

describe('회의 라이프사이클 (integration)', () => {
  let auth: string;
  let userId: string;
  let roomId: string;
  let privateRoomId: string;

  beforeEach(async () => {
    const host = await createUserWithToken();
    const room = await seedRoom(host.id);
    auth = host.auth;
    userId = host.id;
    roomId = room.roomId;
    privateRoomId = room.privateRoomIds[0];
  });

  it('회의 시작 → 목록에 ongoing 으로 보인다', async () => {
    const start = await request()
      .post(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', auth)
      .send({ private_room_id: privateRoomId });

    expect(start.status).toBe(201);
    expect(start.body.status).toBe('ongoing');
    expect(start.body.host_id).toBe(userId);

    const list = await request()
      .get(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', auth);

    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      id: start.body.id,
      status: 'ongoing',
    });
  });

  it('같은 프라이빗룸에서 재시작 → 기존 회의 멱등 반환(새로 안 생김)', async () => {
    const first = await request()
      .post(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', auth)
      .send({ private_room_id: privateRoomId });

    const second = await request()
      .post(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', auth)
      .send({ private_room_id: privateRoomId });

    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const count = await prisma.meeting.count({ where: { roomId } });
    expect(count).toBe(1);
  });

  it('회의 종료 → status ended, message_count 집계', async () => {
    const start = await request()
      .post(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', auth)
      .send({ private_room_id: privateRoomId });
    const meetingId = start.body.id;

    // 회의 구간에 일반 채팅 2건
    await prisma.chatMessage.createMany({
      data: [
        { roomId, privateRoomId, userId, content: '안녕', type: 'text' },
        { roomId, privateRoomId, userId, content: '회의시작', type: 'text' },
      ],
    });

    const end = await request()
      .post(`/api/rooms/${roomId}/meetings/${meetingId}/end`)
      .set('Authorization', auth);

    expect(end.status).toBe(200);
    expect(end.body.status).toBe('ended');
    expect(end.body.message_count).toBe(2);

    // 회의 중 채팅을 남긴 사람이 참여자로 스냅샷된다 (meetingParticipant row).
    const participants = await prisma.meetingParticipant.findMany({
      where: { meetingId },
    });
    expect(participants.map(p => p.userId)).toContain(userId);

    // 이미 종료된 회의를 다시 종료해도 멱등 (상태 유지).
    const again = await request()
      .post(`/api/rooms/${roomId}/meetings/${meetingId}/end`)
      .set('Authorization', auth);
    expect(again.status).toBe(200);
    expect(again.body.status).toBe('ended');
  });

  it('회의 구간 채팅 조회 → 일반(text) 메시지만 시간순으로 반환', async () => {
    const start = await request()
      .post(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', auth)
      .send({ private_room_id: privateRoomId });
    const meetingId = start.body.id;

    await prisma.chatMessage.create({
      data: {
        roomId,
        privateRoomId,
        userId,
        content: '첫 메시지',
        type: 'text',
      },
    });
    // 시스템 메시지(meeting_start)는 구간 채팅에서 제외되어야 한다.
    await prisma.chatMessage.create({
      data: {
        roomId,
        privateRoomId,
        userId,
        content: null,
        type: 'meeting_start',
      },
    });

    const chats = await request()
      .get(`/api/rooms/${roomId}/meetings/${meetingId}/chats`)
      .set('Authorization', auth);

    expect(chats.status).toBe(200);
    expect(chats.body).toHaveLength(1);
    expect(chats.body[0].type).toBe('text');
    expect(chats.body[0].content).toBe('첫 메시지');
  });
});
