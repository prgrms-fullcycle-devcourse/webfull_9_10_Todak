/*
 * [영역 4] 프라이빗 룸 입장/퇴장 (HTTP 통합)
 * - 다른 프라이빗룸 입장 중 입장 → 409 ALREADY_IN_PRIVATE_ROOM
 * - 활성 세션 없이 퇴장 → 400 NOT_IN_PRIVATE_ROOM
 * - 마지막 멤버 퇴장 + 진행 중 회의 → meeting_cancelled: true / 남으면 false
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  addMember,
  createUserWithToken,
  request,
  seedRoom,
} from '../../app-harness.js';

describe('프라이빗 룸 입장/퇴장 (integration)', () => {
  let host: Awaited<ReturnType<typeof createUserWithToken>>;
  let roomId: string;
  let prA: string;
  let prB: string;

  beforeEach(async () => {
    host = await createUserWithToken();
    const room = await seedRoom(host.id);
    roomId = room.roomId;
    [prA, prB] = room.privateRoomIds;
  });

  const enter = (auth: string, pr: string) =>
    request()
      .post(`/api/rooms/${roomId}/private-room/${pr}/enter`)
      .set('Authorization', auth);
  const leave = (auth: string, pr: string) =>
    request()
      .post(`/api/rooms/${roomId}/private-room/${pr}/leave`)
      .set('Authorization', auth);

  it('입장 → 201', async () => {
    const res = await enter(host.auth, prA);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ private_room_id: prA, user_id: host.id });
  });

  it('다른 프라이빗룸 입장 중 또 입장 → 409 ALREADY_IN_PRIVATE_ROOM', async () => {
    await enter(host.auth, prA);
    const res = await enter(host.auth, prB);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_IN_PRIVATE_ROOM');
  });

  it('활성 세션 없이 퇴장 → 400 NOT_IN_PRIVATE_ROOM', async () => {
    const res = await leave(host.auth, prA);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NOT_IN_PRIVATE_ROOM');
  });

  it('마지막 멤버 퇴장 + 진행 중 회의 → meeting_cancelled: true', async () => {
    await enter(host.auth, prA);
    // 회의 시작
    await request()
      .post(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', host.auth)
      .send({ private_room_id: prA });

    const res = await leave(host.auth, prA);
    expect(res.status).toBe(200);
    expect(res.body.meeting_cancelled).toBe(true);
  });

  it('다른 참여자가 남아 있으면 → meeting_cancelled: false', async () => {
    const other = await createUserWithToken();
    await addMember(roomId, other.id);

    await enter(host.auth, prA);
    await enter(other.auth, prA);
    await request()
      .post(`/api/rooms/${roomId}/meetings`)
      .set('Authorization', host.auth)
      .send({ private_room_id: prA });

    // host 가 나가도 other 가 남아 있으므로 회의는 취소되지 않는다.
    const res = await leave(host.auth, prA);
    expect(res.status).toBe(200);
    expect(res.body.meeting_cancelled).toBe(false);
  });
});
