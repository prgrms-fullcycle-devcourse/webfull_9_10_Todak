/*
 * HTTP 통합테스트용 하네스.
 *
 * - app: 실제 Express 앱 (setup.ts 의 외부 I/O 모킹이 적용된 상태로 로드됨)
 * - request(): supertest 로 app 에 직접 요청을 쏜다 (네트워크 포트 불필요)
 * - createUserWithToken(): DB 에 User 를 만들고 유효한 access token 을 발급
 * - seedRoom(): 룸 + 호스트 멤버 + 프라이빗룸 2개를 DB 에 직접 심는다
 *   (룸 생성 엔드포인트는 GitHub 호출이 있어, 그 자체를 검증하는 테스트 외에는 직접 시드)
 */
import supertest from 'supertest';

import app from '@/app.js';
import { prisma } from '@/lib/prisma.js';
import { signAccessToken } from '@/services/auth.service.js';

export const request = () => supertest(app);

let seq = 0;
function uniq(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export interface TestUser {
  id: string;
  githubUsername: string;
  token: string;
  auth: string; // 'Bearer <token>'
}

export async function createUserWithToken(
  login = uniq('user'),
): Promise<TestUser> {
  const user = await prisma.user.create({
    data: {
      githubId: uniq('gh'),
      githubUsername: login,
      avatarUrl: 'https://example.com/a.png',
      accessToken: 'gh_access_token',
    },
  });

  const token = signAccessToken({
    id: user.id,
    githubId: Number.isNaN(Number(user.githubId)) ? 1 : Number(user.githubId),
    login: user.githubUsername,
    avatarUrl: user.avatarUrl ?? '',
    githubAccessToken: 'gh_access_token',
  });

  return {
    id: user.id,
    githubUsername: user.githubUsername,
    token,
    auth: `Bearer ${token}`,
  };
}

export interface SeededRoom {
  roomId: string;
  inviteCode: string;
  privateRoomIds: string[]; // [회의실 A, 회의실 B]
}

export async function seedRoom(
  hostUserId: string,
  opts: { maxMembers?: number; inviteCode?: string } = {},
): Promise<SeededRoom> {
  seq += 1;
  // 기본 초대코드는 join 검증 정규식 /^[A-Z0-9]{4}-[A-Z0-9]{4}$/ 을 만족하게 만든다.
  const defaultCode = `ROOM-${String(seq).padStart(4, '0')}`;
  const room = await prisma.room.create({
    data: {
      name: uniq('room'),
      inviteCode: opts.inviteCode ?? defaultCode,
      maxMembers: opts.maxMembers ?? 6,
    },
  });

  await prisma.roomMember.create({
    data: {
      roomId: room.id,
      userId: hostUserId,
      roles: ['backend'],
      isHost: true,
      // 룸 상세 응답은 characterType 이 설정된(=온보딩 완료) 멤버만 노출한다.
      characterType: 'cat',
      detailedRole: 'Backend Developer',
      nickname: 'host',
    },
  });

  const a = await prisma.privateRoom.create({
    data: { roomId: room.id, name: '회의실 A' },
  });
  const b = await prisma.privateRoom.create({
    data: { roomId: room.id, name: '회의실 B' },
  });

  return {
    roomId: room.id,
    inviteCode: room.inviteCode,
    privateRoomIds: [a.id, b.id],
  };
}

// 룸에 추가 멤버를 넣는다 (권한/정원 테스트용).
export async function addMember(roomId: string, userId: string): Promise<void> {
  await prisma.roomMember.create({
    data: { roomId, userId, roles: ['frontend'], characterType: 'dog' },
  });
}
