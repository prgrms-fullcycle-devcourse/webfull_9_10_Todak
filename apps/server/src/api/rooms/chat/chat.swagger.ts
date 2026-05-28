import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';
import {
  PrivateRoomParamsSchema,
  RoomIdParamsSchema,
} from '../private-room/private-room.schema.js';

import { ChatSchema, ChatsQuerySchema } from './chat.schema.js';

const errorResponse = (description: string, code: string, message: string) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(false),
        error: z.string(),
        code: z.string(),
      }),
      example: { success: false, error: message, code },
    },
  },
});

const mainChatExample = [
  {
    id: 'uuid-chat-1',
    user: {
      github_username: 'jiyun-dev',
      avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
    content: 'socket.io 어떨까요?',
    type: 'text',
    created_at: '2026-05-18T14:04:00.000Z',
  },
];

const privateChatExample = [
  {
    id: 'uuid-chat-2',
    user: {
      github_username: 'jiyun-dev',
      avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
    content: '소켓 방식으로 가는 게 맞을 것 같아요',
    type: 'text',
    created_at: '2026-05-18T14:10:00.000Z',
  },
  {
    id: 'uuid-chat-3',
    user: {
      github_username: 'sooah-dev',
      avatar_url: 'https://avatars.githubusercontent.com/u/2?v=4',
    },
    content: null,
    type: 'meeting_start',
    created_at: '2026-05-18T14:02:00.000Z',
  },
];

// ─── GET /rooms/:roomId/chats ──────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/chats',
  tags: ['Chats'],
  summary: '메인 룸 채팅 히스토리 조회',
  description:
    '메인 룸의 채팅 메시지를 최신순으로 반환합니다. `before` 쿼리로 페이지네이션(무한 스크롤)할 수 있습니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
    query: ChatsQuerySchema,
  },
  responses: {
    200: {
      description: '채팅 히스토리 조회 성공',
      content: {
        'application/json': {
          schema: z.array(ChatSchema),
          example: mainChatExample,
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음 (또는 멤버 아님)',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/private-room/:privateRoomId/chats ──────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/private-room/{privateRoomId}/chats',
  tags: ['Chats'],
  summary: '프라이빗 룸 채팅 히스토리 조회',
  description:
    '특정 프라이빗 룸의 채팅 메시지를 최신순으로 반환합니다. ' +
    '`type` 이 `meeting_start` / `meeting_end` 인 시스템 메시지도 포함됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: PrivateRoomParamsSchema,
    query: ChatsQuerySchema,
  },
  responses: {
    200: {
      description: '채팅 히스토리 조회 성공',
      content: {
        'application/json': {
          schema: z.array(ChatSchema),
          example: privateChatExample,
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '프라이빗 룸을 찾을 수 없음',
      'PRIVATE_ROOM_NOT_FOUND',
      '프라이빗 룸을 찾을 수 없습니다.',
    ),
  },
});
