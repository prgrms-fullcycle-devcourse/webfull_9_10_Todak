import { prisma } from '../lib/prisma.js';

import {
  assertInPrivateRoomSession,
  assertPrivateRoomBelongsToRoom,
  assertRoomMember,
} from './room-guards.js';

export interface ReactionSummary {
  emoji: string;
  count: number;
  me: boolean; // 요청한 유저가 이 이모지를 눌렀는지
}

export interface ChatPayload {
  id: string;
  room_id: string;
  private_room_id: string | null;
  user: {
    github_username: string;
    avatar_url: string | null;
  };
  content: string | null;
  type: string;
  created_at: string;
  reactions: ReactionSummary[];
}

interface ChatsQuery {
  before?: string;
  limit: number;
}

interface ChatRow {
  id: string;
  roomId: string;
  privateRoomId: string | null;
  content: string | null;
  type: string;
  createdAt: Date;
  user: {
    githubUsername: string;
    avatarUrl: string | null;
  };
  reactions: { emoji: string; userId: string }[];
}

const includeChat = {
  user: { select: { githubUsername: true, avatarUrl: true } },
  reactions: { select: { emoji: true, userId: true } },
} as const;

function aggregateReactions(
  rows: { emoji: string; userId: string }[],
  currentUserId: string,
): ReactionSummary[] {
  const byEmoji = new Map<string, { count: number; me: boolean }>();

  for (const row of rows) {
    const entry = byEmoji.get(row.emoji) ?? { count: 0, me: false };
    entry.count += 1;
    if (row.userId === currentUserId) {
      entry.me = true;
    }
    byEmoji.set(row.emoji, entry);
  }

  return Array.from(byEmoji, ([emoji, { count, me }]) => ({
    emoji,
    count,
    me,
  }));
}

function toPayload(row: ChatRow, currentUserId: string): ChatPayload {
  return {
    id: row.id,
    room_id: row.roomId,
    private_room_id: row.privateRoomId,
    user: {
      github_username: row.user.githubUsername,
      avatar_url: row.user.avatarUrl,
    },
    content: row.content,
    type: row.type,
    created_at: row.createdAt.toISOString(),
    reactions: aggregateReactions(row.reactions, currentUserId),
  };
}

/*
 * 주어진 룸/프라이빗룸 조건의 채팅을 before 기준 과거로 최신순(DESC) limit 개 조회해 payload 로 변환.
 * (getMainRoomChats / getPrivateRoomChats 공통 조회부)
 */
async function fetchChats(
  where: { roomId: string; privateRoomId: string | null },
  { before, limit }: ChatsQuery,
  currentUserId: string,
): Promise<ChatPayload[]> {
  const rows = await prisma.chatMessage.findMany({
    where: {
      ...where,
      ...(before !== undefined && { createdAt: { lt: new Date(before) } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: includeChat,
  });

  return rows.map(row => toPayload(row, currentUserId));
}

/*
 * 메인 룸 채팅 히스토리 (private_room_id IS NULL).
 * before 보다 과거 메시지를 최신순(DESC)으로 limit 개 반환.
 */
export async function getMainRoomChats(
  userId: string,
  roomId: string,
  query: ChatsQuery,
): Promise<ChatPayload[]> {
  // 멤버 검증과 메시지 조회는 독립적이라 병렬로 쏜다. 비멤버면 throw 되고 조회 결과는 버려진다.
  const [, chats] = await Promise.all([
    assertRoomMember(roomId, userId),
    fetchChats({ roomId, privateRoomId: null }, query, userId),
  ]);

  return chats;
}

/*
 * 프라이빗 룸 채팅 히스토리.
 * meeting_start / meeting_end 같은 시스템 메시지도 함께 포함됩니다.
 */
export async function getPrivateRoomChats(
  userId: string,
  roomId: string,
  privateRoomId: string,
  query: ChatsQuery,
): Promise<ChatPayload[]> {
  /*
   * 두 검증과 메시지 조회는 독립적이라 병렬로 쏜다.
   * 검증 중 하나라도 실패하면 Promise.all 이 거부되고 조회 결과는 버려진다.
   * (둘 다 실패 시 표면화되는 에러는 먼저 끝난 쪽 — 모두 not-found 류라 무방)
   */
  const [, , chats] = await Promise.all([
    assertRoomMember(roomId, userId),
    assertPrivateRoomBelongsToRoom(roomId, privateRoomId),
    fetchChats({ roomId, privateRoomId }, query, userId),
  ]);

  return chats;
}

/*
 * 채팅 메시지 저장 (socket chat:send 핸들러에서 호출).
 * - 메인 룸: 룸 멤버여야 함
 * - 프라이빗 룸: 룸 멤버 + 현재 해당 프라이빗 룸 세션이 열려있어야 함
 */
export async function createChat(
  userId: string,
  input: { roomId: string; privateRoomId?: string; content: string },
): Promise<ChatPayload> {
  await assertRoomMember(input.roomId, userId);

  if (input.privateRoomId !== undefined) {
    await assertPrivateRoomBelongsToRoom(input.roomId, input.privateRoomId);
    await assertInPrivateRoomSession(input.privateRoomId, userId);
  }

  const saved = await prisma.chatMessage.create({
    data: {
      roomId: input.roomId,
      privateRoomId: input.privateRoomId ?? null,
      userId,
      content: input.content,
      type: 'text',
    },
    include: includeChat,
  });

  return toPayload(saved, userId);
}
