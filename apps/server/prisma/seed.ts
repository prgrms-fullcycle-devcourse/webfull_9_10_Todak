/**
 * prisma/seed.ts
 *
 * 실행:
 *   pnpm --filter todak-server db:seed
 */

import { prisma } from '../src/lib/prisma.js';
import { signJwt } from '../src/services/auth.service.js';

async function main() {
  console.log('🌱 Seeding...');

  // ── 1. 유저 2명 ──────────────────────────────────────────────
  const userA = await prisma.user.upsert({
    where: { githubId: 'seed-user-1' },
    update: {},
    create: {
      githubId: 'seed-user-1',
      githubUsername: 'alice',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    },
  });

  const userB = await prisma.user.upsert({
    where: { githubId: 'seed-user-2' },
    update: {},
    create: {
      githubId: 'seed-user-2',
      githubUsername: 'bob',
      avatarUrl: 'https://avatars.githubusercontent.com/u/2',
    },
  });

  // ── 2. 룸 1개 ────────────────────────────────────────────────
  const room = await prisma.room.upsert({
    where: { inviteCode: 'SEED01' },
    update: {},
    create: {
      name: '테스트 룸',
      inviteCode: 'SEED01',
    },
  });

  // ── 3. 룸 멤버 등록 ──────────────────────────────────────────
  for (const [user, isHost] of [
    [userA, true],
    [userB, false],
  ] as const) {
    const existing = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: user.id },
    });
    if (!existing) {
      await prisma.roomMember.create({
        data: { roomId: room.id, userId: user.id, isHost, status: 'focus' },
      });
    }
  }

  // ── 4. 프라이빗 룸 2개 ───────────────────────────────────────
  const privateRoomA = await prisma.privateRoom.create({
    data: { roomId: room.id, name: '회의실 A' },
  });
  const privateRoomB = await prisma.privateRoom.create({
    data: { roomId: room.id, name: '회의실 B' },
  });

  // ── 5. alice → 회의실 A 입장 세션 ────────────────────────────
  await prisma.privateRoomSession.create({
    data: { privateRoomId: privateRoomA.id, userId: userA.id },
  });

  // ── 6. 회의실 A에 ongoing 회의 1개 ───────────────────────────
  await prisma.meeting.create({
    data: {
      roomId: room.id,
      privateRoomId: privateRoomA.id,
      hostId: userA.id,
      status: 'ongoing',
    },
  });

  // ── 7. JWT 토큰 발급 ─────────────────────────────────────────
  const tokenAlice = signJwt({
    id: userA.id,
    githubId: 1,
    login: userA.githubUsername,
    avatarUrl: userA.avatarUrl ?? '',
    githubAccessToken: '',
  });

  const tokenBob = signJwt({
    id: userB.id,
    githubId: 2,
    login: userB.githubUsername,
    avatarUrl: userB.avatarUrl ?? '',
    githubAccessToken: '',
  });

  console.log('\n✅ Seed 완료!\n');
  console.log('  Room ID        :', room.id);
  console.log(
    '  PrivateRoom A  :',
    privateRoomA.id,
    '← (alice 입장 중 + ongoing 회의)',
  );
  console.log('  PrivateRoom B  :', privateRoomB.id, '← (비어 있음)');
  console.log('\n  🔑 Token alice :', tokenAlice);
  console.log('\n  🔑 Token bob   :', tokenBob);
  console.log('\n📋 테스트 순서:');
  console.log('  1) GET  /api/rooms/:roomId/private-room  (alice 토큰)');
  console.log('     → A: alice 입장 중 + is_meeting_active: true');
  console.log('     → B: 비어 있음');
  console.log(
    '  2) POST /api/rooms/:roomId/private-room/:privateRoomAId/enter  (bob 토큰)',
  );
  console.log('     → bob 입장, entered_at 반환');
  console.log(
    '  3) POST /api/rooms/:roomId/private-room/:privateRoomAId/leave  (alice 토큰)',
  );
  console.log('     → meeting_cancelled: false  (bob 아직 있음)');
  console.log(
    '  4) POST /api/rooms/:roomId/private-room/:privateRoomAId/leave  (bob 토큰)',
  );
  console.log('     → 마지막 퇴장 → meeting_cancelled: true\n');
}

main()
  .catch(e => {
    console.error('❌ Seed 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
