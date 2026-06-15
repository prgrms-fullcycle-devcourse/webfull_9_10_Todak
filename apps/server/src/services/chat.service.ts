import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

import {
  assertAllowedAttachment,
  createDownloadUrl,
  headAttachment,
} from './attachment.service.js';
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

export interface AttachmentPayload {
  url: string; // presigned GET URL (만료 있음 — 저장하지 않고 조회 시 생성)
  mime: string;
  size: number;
  name: string; // 원본 파일명 (표시/다운로드용)
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
  type: string; // text | meeting_start | meeting_end
  attachments: AttachmentPayload[]; // 첨부 없으면 빈 배열
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
  attachments: {
    s3Key: string;
    mime: string;
    size: number;
    originalName: string;
  }[];
}

const includeChat = {
  user: { select: { githubUsername: true, avatarUrl: true } },
  reactions: { select: { emoji: true, userId: true } },
  attachments: {
    select: { s3Key: true, mime: true, size: true, originalName: true },
    orderBy: { createdAt: 'asc' }, // 첨부 순서 보존
  },
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

async function toPayload(
  row: ChatRow,
  currentUserId: string,
): Promise<ChatPayload> {
  /*
   * 각 첨부마다 조회용 presigned GET URL 을 즉석에서 발급 (URL 은 DB 에 저장 안 함).
   * getSignedUrl 은 네트워크 호출 없이 로컬 서명만 하므로 행마다 불러도 가볍다.
   */
  const attachments = await Promise.all(
    row.attachments.map(async att => ({
      url: await createDownloadUrl(att.s3Key, att.originalName),
      mime: att.mime,
      size: att.size,
      name: att.originalName,
    })),
  );

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
    attachments,
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

  return Promise.all(rows.map(row => toPayload(row, currentUserId)));
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
 * 첨부 1건을 검증해 DB 저장용 데이터로 변환.
 * - 다른 룸으로 발급된 key 를 끼워 넣지 못하게 룸 prefix 확인
 * - S3 에 실제로 올라왔는지(headObject) 확인하고, 클라가 보낸 메타 대신
 *   S3 의 실제 mime/size 를 신뢰해 허용 정책을 재검증
 */
async function buildAttachment(
  roomId: string,
  attachment: { s3Key: string; fileName: string },
): Promise<{
  s3Key: string;
  mime: string;
  size: number;
  originalName: string;
}> {
  if (!attachment.s3Key.startsWith(`chat/${roomId}/`)) {
    throw new AppError('BAD_REQUEST');
  }

  const head = await headAttachment(attachment.s3Key);
  if (head === null) {
    throw new AppError('BAD_REQUEST'); // 업로드되지 않은 key
  }

  assertAllowedAttachment(head.mime, head.size);

  return {
    s3Key: attachment.s3Key,
    mime: head.mime,
    size: head.size,
    originalName: attachment.fileName,
  };
}

/*
 * 채팅 메시지 저장 (socket chat:send 핸들러에서 호출).
 * - 메인 룸: 룸 멤버여야 함
 * - 프라이빗 룸: 룸 멤버 + 현재 해당 프라이빗 룸 세션이 열려있어야 함
 * - content / attachments 중 하나 이상 필요 (핸들러 스키마에서 보장)
 * - 첨부는 한 메시지에 여러 개 가능 (개수 상한은 핸들러 스키마에서 제한)
 */
export async function createChat(
  userId: string,
  input: {
    roomId: string;
    privateRoomId?: string;
    content?: string;
    attachments?: { s3Key: string; fileName: string }[];
  },
): Promise<ChatPayload> {
  await assertRoomMember(input.roomId, userId);

  if (input.privateRoomId !== undefined) {
    await assertPrivateRoomBelongsToRoom(input.roomId, input.privateRoomId);
    await assertInPrivateRoomSession(input.privateRoomId, userId);
  }

  // 모든 첨부를 병렬 검증 (각각 S3 headObject)
  const attachments = await Promise.all(
    (input.attachments ?? []).map(att => buildAttachment(input.roomId, att)),
  );

  const saved = await prisma.chatMessage.create({
    data: {
      roomId: input.roomId,
      privateRoomId: input.privateRoomId ?? null,
      userId,
      content: input.content ?? null,
      type: 'text',
      ...(attachments.length > 0 && {
        attachments: { create: attachments },
      }),
    },
    include: includeChat,
  });

  return toPayload(saved, userId);
}

export async function createMeetingSystemChat(
  userId: string,
  input: {
    roomId: string;
    privateRoomId: string;
    type: 'meeting_start' | 'meeting_end';
    content: string;
  },
): Promise<ChatPayload> {
  const saved = await prisma.chatMessage.create({
    data: {
      roomId: input.roomId,
      privateRoomId: input.privateRoomId,
      userId,
      content: input.content,
      type: input.type,
    },
    include: includeChat,
  });

  return toPayload(saved, userId);
}
