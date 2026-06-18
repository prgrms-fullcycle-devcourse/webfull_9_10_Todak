import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

import { AddCollaboratorSchema } from './collaborators.schema.js';

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

const githubReauth401 = {
  description:
    '인증 실패 — 앱 인증 누락/만료(UNAUTHORIZED) 또는 GitHub 토큰 만료·무효로 GitHub 재로그인 필요(GITHUB_REAUTH_REQUIRED)',
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(false),
        error: z.string(),
        code: z.enum(['UNAUTHORIZED', 'GITHUB_REAUTH_REQUIRED']),
      }),
      example: {
        success: false,
        error: 'GitHub 인증이 만료되었습니다. 다시 로그인해주세요.',
        code: 'GITHUB_REAUTH_REQUIRED',
      },
    },
  },
};

const roomIdParam = z.object({ roomId: z.string().uuid() });

// ─── POST /rooms/{roomId}/repo/collaborators ──────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/repo/collaborators',
  tags: ['Rooms'],
  summary: '레포 협업자 초대',
  description:
    '연동된 GitHub 레포에 협업자를 초대합니다. 방장만 호출 가능합니다. ' +
    '대상 유저가 이미 협업자인 경우 invitationId 는 null 을 반환합니다. ' +
    '초대 수락 전까지는 GET /collaborators/invitations 에서 pending 상태로 확인할 수 있습니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: roomIdParam,
    body: {
      content: {
        'application/json': {
          schema: AddCollaboratorSchema,
          example: { username: 'jiyun-dev', permission: 'push' },
        },
      },
    },
  },
  responses: {
    200: {
      description: '초대 전송 성공 (또는 이미 협업자)',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              invitationId: z.number().nullable(),
            }),
          }),
          example: { success: true, data: { invitationId: 987654321 } },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      '권한 없음 (방장 아님 / 레포 Admin 권한 없음)',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      '룸에 연결된 레포 없음 또는 GitHub 레포를 찾을 수 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
    409: errorResponse(
      '이미 존재하는 초대',
      'CONFLICT',
      '이미 존재하는 리소스입니다.',
    ),
  },
});

// ─── GET /rooms/{roomId}/repo/collaborators ───────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/repo/collaborators',
  tags: ['Rooms'],
  summary: '레포 협업자 목록 조회',
  description:
    '초대를 수락한 GitHub 레포 협업자 목록을 반환합니다. 룸 멤버 전체가 호출 가능합니다. ' +
    '보류 중인 초대는 GET /collaborators/invitations 에서 확인하세요.',
  security: [{ bearerAuth: [] }],
  request: { params: roomIdParam },
  responses: {
    200: {
      description: '협업자 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                login: z.string(),
                avatarUrl: z.string(),
                permission: z.enum([
                  'pull',
                  'triage',
                  'push',
                  'maintain',
                  'admin',
                ]),
              }),
            ),
          }),
          example: {
            success: true,
            data: [
              {
                login: 'Kang-Ellie',
                avatarUrl:
                  'https://avatars.githubusercontent.com/u/252135802?v=4',
                permission: 'admin',
              },
              {
                login: 'jiyun-dev',
                avatarUrl: 'https://avatars.githubusercontent.com/u/1234',
                permission: 'push',
              },
            ],
          },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      '레포 Admin 권한 없음',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      '룸에 연결된 레포 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
  },
});

// ─── GET /rooms/{roomId}/repo/collaborators/invitations ──────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/repo/collaborators/invitations',
  tags: ['Rooms'],
  summary: '보류 중인 협업자 초대 목록 조회',
  description:
    '수락 대기 중인 GitHub 레포 협업자 초대 목록을 반환합니다. ' +
    '룸 멤버 전체가 호출 가능합니다. 초대를 취소하려면 DELETE /collaborators/invitations/:invitationId 를 사용하세요.',
  security: [{ bearerAuth: [] }],
  request: { params: roomIdParam },
  responses: {
    200: {
      description: '보류 중인 초대 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.number(),
                login: z.string(),
                permission: z.string(),
                invitedAt: z.string(),
              }),
            ),
          }),
          example: {
            success: true,
            data: [
              {
                id: 987654321,
                login: 'jiyun-dev',
                permission: 'write',
                invitedAt: '2025-06-17T10:00:00Z',
              },
            ],
          },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      '레포 Admin 권한 없음',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      '룸에 연결된 레포 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
  },
});

// ─── DELETE /rooms/{roomId}/repo/collaborators/invitations/{invitationId} ─────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/repo/collaborators/invitations/{invitationId}',
  tags: ['Rooms'],
  summary: '협업자 초대 취소',
  description:
    '보류 중인 GitHub 레포 협업자 초대를 취소합니다. 방장만 호출 가능합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      roomId: z.string().uuid(),
      invitationId: z.coerce.number().int().positive(),
    }),
  },
  responses: {
    200: {
      description: '초대 취소 성공',
      content: {
        'application/json': {
          schema: z.object({ success: z.literal(true), message: z.string() }),
          example: { success: true, message: '초대가 취소되었습니다.' },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      '권한 없음 (방장 아님 / 레포 Admin 권한 없음)',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      '초대를 찾을 수 없음',
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다.',
    ),
  },
});

// ─── DELETE /rooms/{roomId}/repo/collaborators/{username} ─────────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/repo/collaborators/{username}',
  tags: ['Rooms'],
  summary: '레포 협업자 제거',
  description:
    '연동된 GitHub 레포에서 협업자를 제거하고 룸에서도 추방합니다. 방장만 호출 가능합니다. ' +
    '추방된 유저에게는 room:kicked 소켓 이벤트가 전송되며, ' +
    '나머지 멤버에게는 room:user-left 이벤트가 브로드캐스트됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      roomId: z.string().uuid(),
      username: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: '협업자 제거 성공',
      content: {
        'application/json': {
          schema: z.object({ success: z.literal(true), message: z.string() }),
          example: { success: true, message: '협업자가 제거되었습니다.' },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      '권한 없음 (방장 아님 / 레포 Admin 권한 없음)',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      '룸에 연결된 레포 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
  },
});
