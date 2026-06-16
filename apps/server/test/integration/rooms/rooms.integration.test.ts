/*
 * [영역 2] 룸 생성 → 프라이빗룸 2개 자동 생성 → 조회
 * [영역 5] 룸 참여(초대 코드)
 * [영역 6] 권한·소속 격리
 */
import { describe, expect, it } from 'vitest';

import {
  addMember,
  createUserWithToken,
  request,
  seedRoom,
} from '../app-harness.js';

const INVITE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

describe('룸 생성/조회 (integration)', () => {
  it('POST /rooms → 201, 직후 프라이빗룸(회의실) 2개가 자동 생성된다', async () => {
    const user = await createUserWithToken();

    const created = await request()
      .post('/api/rooms')
      .set('Authorization', user.auth)
      .send({ name: '토닥 회의룸', repo_full_name: 'todak/todak' });

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.data.invite_code).toMatch(INVITE_RE);
    expect(created.body.data.webhook_registered).toBe(true);

    const roomId = created.body.data.id;

    // 방금 만든 기능 회귀 방지: 회의실 2개 확인
    const priv = await request()
      .get(`/api/rooms/${roomId}/private-room`)
      .set('Authorization', user.auth);

    expect(priv.status).toBe(200);
    expect(priv.body).toHaveLength(2);
    expect(priv.body.map((p: { name: string }) => p.name).sort()).toEqual([
      '회의실 A',
      '회의실 B',
    ]);
  });

  it('GET /rooms, GET /rooms/:id 매핑 확인', async () => {
    const user = await createUserWithToken();
    const { roomId } = await seedRoom(user.id);

    const list = await request()
      .get('/api/rooms')
      .set('Authorization', user.auth);
    expect(list.status).toBe(200);
    expect(list.body.data.map((r: { id: string }) => r.id)).toContain(roomId);

    const detail = await request()
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', user.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(roomId);
    expect(detail.body.data.members).toHaveLength(1);
    expect(detail.body.data.members[0].is_host).toBe(true);
  });
});

describe('룸 참여 - 초대 코드 (integration)', () => {
  it('유효 코드 → 참여 성공(200)', async () => {
    const host = await createUserWithToken();
    const { roomId } = await seedRoom(host.id, { inviteCode: 'ABCD-1234' });

    const joiner = await createUserWithToken();
    const res = await request()
      .post('/api/rooms/join')
      .set('Authorization', joiner.auth)
      .send({ invite_code: 'ABCD-1234' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, room_id: roomId });
  });

  it('존재하지 않는 코드 → 404 INVALID_INVITE_CODE', async () => {
    const joiner = await createUserWithToken();
    const res = await request()
      .post('/api/rooms/join')
      .set('Authorization', joiner.auth)
      .send({ invite_code: 'ZZZZ-9999' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('INVALID_INVITE_CODE');
  });

  it('이미 참여한 룸 → 409 ALREADY_JOINED', async () => {
    const host = await createUserWithToken();
    await seedRoom(host.id, { inviteCode: 'JOIN-0001' });
    const joiner = await createUserWithToken();

    const first = await request()
      .post('/api/rooms/join')
      .set('Authorization', joiner.auth)
      .send({ invite_code: 'JOIN-0001' });
    expect(first.status).toBe(200);

    const second = await request()
      .post('/api/rooms/join')
      .set('Authorization', joiner.auth)
      .send({ invite_code: 'JOIN-0001' });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_JOINED');
  });

  it('정원 초과 → 409 ROOM_FULL', async () => {
    const host = await createUserWithToken();
    // maxMembers 1 → 호스트로 이미 가득 참
    await seedRoom(host.id, { inviteCode: 'FULL-0001', maxMembers: 1 });
    const joiner = await createUserWithToken();

    const res = await request()
      .post('/api/rooms/join')
      .set('Authorization', joiner.auth)
      .send({ invite_code: 'FULL-0001' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROOM_FULL');
  });
});

describe('권한·소속 격리 (integration)', () => {
  it('내가 멤버가 아닌 룸 조회 → 404 ROOM_NOT_FOUND (존재 비노출)', async () => {
    const owner = await createUserWithToken();
    const { roomId } = await seedRoom(owner.id);

    const outsider = await createUserWithToken();
    const res = await request()
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', outsider.auth);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROOM_NOT_FOUND');
  });

  it('비멤버가 다른 룸의 회의 목록 접근 → 404 ROOM_NOT_FOUND', async () => {
    const owner = await createUserWithToken();
    const { roomId } = await seedRoom(owner.id);

    const outsider = await createUserWithToken();
    const res = await request()
      .get(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', outsider.auth);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROOM_NOT_FOUND');
  });

  it('멤버라도 다른 룸 소속 회의 ID 로 접근 → 404 MEETING_NOT_FOUND', async () => {
    // roomA 의 회의를 roomB 경로로 접근 시도
    const userA = await createUserWithToken();
    const roomA = await seedRoom(userA.id);

    const start = await request()
      .post(`/api/rooms/${roomA.roomId}/meetings`)
      .set('Authorization', userA.auth)
      .send({ private_room_id: roomA.privateRoomIds[0] });
    expect(start.status).toBe(201);
    const meetingId = start.body.id;

    // userA 가 멤버인 다른 룸 roomB
    const roomB = await seedRoom(userA.id);
    await addMember(roomB.roomId, userA.id).catch(() => {}); // 이미 host 멤버라 무시

    const res = await request()
      .post(`/api/rooms/${roomB.roomId}/meetings/${meetingId}/end`)
      .set('Authorization', userA.auth);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('MEETING_NOT_FOUND');
  });
});
