import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { getUserId } from '../../../middleware/auth.middleware.js';
import { consumeRateLimit } from '../../../middleware/rateLimit.middleware.js';
import {
  assertAllowedAttachment,
  createUploadUrl,
} from '../../../services/ai/attachment.service.js';
import {
  ChatPayload,
  getMainRoomChats,
} from '../../../services/ai/chat.service.js';
import { assertRoomMember } from '../../../services/rooms/room-guards.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { AttachmentUploadBody, ChatsQuery } from './chat.schema.js';

// 첨부 업로드 URL 발급 폭주 방지 — 유저당 1분에 30개
const UPLOAD_RATE_LIMIT = 30;
const UPLOAD_RATE_WINDOW_MS = 60_000;

/*
 * url 컨텍스트로 알 수 있는 room_id / private_room_id 는 응답에서 제외
 * (메인 룸 / 프라이빗 룸 채팅 응답 공통 — private-room.controller 도 재사용)
 */
export function slim(chat: ChatPayload) {
  return {
    id: chat.id,
    user: chat.user,
    content: chat.content,
    type: chat.type,
    attachments: chat.attachments,
    created_at: chat.created_at,
    reactions: chat.reactions,
  };
}

export async function getMainRoomChatsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);

    const { roomId } = req.params as { roomId: string };
    const { before, limit } = req.query as unknown as ChatsQuery;

    const chats = await getMainRoomChats(userId, roomId, { before, limit });

    res.json(chats.map(slim));
  } catch (err) {
    next(err);
  }
}

/*
 * 첨부(이미지/PDF) 업로드용 presigned PUT URL 발급.
 * 클라이언트는 받은 url 로 S3 에 직접 업로드한 뒤, s3_key 를 chat:send 에 실어 보낸다.
 * (실제 메시지 생성은 socket chat:send 에서 — 여기선 업로드 자리만 내준다)
 */
export async function createAttachmentUploadUrlHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);
    const { roomId } = req.params as { roomId: string };
    const { mime, size } = req.body as AttachmentUploadBody;

    const { allowed } = await consumeRateLimit(
      `ratelimit:attachment:${userId}`,
      UPLOAD_RATE_LIMIT,
      UPLOAD_RATE_WINDOW_MS,
    );
    if (!allowed) {
      throw new AppError('TOO_MANY_REQUESTS');
    }

    await assertRoomMember(roomId, userId);
    assertAllowedAttachment(mime, size);

    const { url, s3Key } = await createUploadUrl(roomId, mime);

    res.json({ upload_url: url, s3_key: s3Key });
  } catch (err) {
    next(err);
  }
}
