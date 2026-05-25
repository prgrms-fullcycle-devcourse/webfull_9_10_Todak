import { StatusCodes } from 'http-status-codes';

import { ErrorInfo } from '../types/index.js';

export const ERROR_CODES = {
  // 400
  BAD_REQUEST: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'BAD_REQUEST',
    message: '요청 형식이 올바르지 않습니다.',
  },
  INVALID_TOKEN: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'INVALID_TOKEN',
    message: '유효하지 않은 토큰입니다.',
  },
  MISSING_FIELD: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'MISSING_FIELD',
    message: '필수 항목이 누락되었습니다.',
  },
  NOT_IN_PRIVATE_ROOM: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'NOT_IN_PRIVATE_ROOM',
    message: '현재 입장 중인 프라이빗 룸이 아닙니다.',
  },

  // 401
  UNAUTHORIZED: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'UNAUTHORIZED',
    message: '인증이 필요합니다.',
  },
  NOT_LOGGED_IN: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'NOT_LOGGED_IN',
    message: '로그인 상태에서만 사용할 수 있습니다.',
  },
  TOKEN_EXPIRED: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'TOKEN_EXPIRED',
    message: '토큰이 만료되었습니다.',
  },

  // 403
  REPO_ADMIN_REQUIRED: {
    statusCode: StatusCodes.FORBIDDEN,
    code: 'REPO_ADMIN_REQUIRED',
    message: '레포지토리 Admin 권한이 필요합니다.',
  },
  FORBIDDEN: {
    statusCode: StatusCodes.FORBIDDEN,
    code: 'FORBIDDEN',
    message: '접근 권한이 없습니다.',
  },
  GITHUB_SCOPE_REQUIRED: {
    statusCode: StatusCodes.FORBIDDEN,
    code: 'GITHUB_SCOPE_REQUIRED',
    message: 'GitHub 권한 동의가 필요합니다.',
  },
  INVALID_STATE: {
    statusCode: StatusCodes.FORBIDDEN,
    code: 'INVALID_STATE',
    message: '보안 검증에 실패했습니다.',
  },

  // 404
  NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'NOT_FOUND',
    message: '요청한 리소스를 찾을 수 없습니다.',
  },
  ROOM_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'ROOM_NOT_FOUND',
    message: '룸을 찾을 수 없습니다.',
  },
  USER_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'USER_NOT_FOUND',
    message: '사용자를 찾을 수 없습니다.',
  },
  REPO_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'REPO_NOT_FOUND',
    message: '레포지토리를 찾을 수 없습니다.',
  },
  PR_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'PR_NOT_FOUND',
    message: 'Pull Request를 찾을 수 없습니다.',
  },
  PRIVATE_ROOM_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'PRIVATE_ROOM_NOT_FOUND',
    message: '프라이빗 룸을 찾을 수 없습니다.',
  },

  // 409
  CONFLICT: {
    statusCode: StatusCodes.CONFLICT,
    code: 'CONFLICT',
    message: '이미 존재하는 리소스입니다.',
  },
  ALREADY_IN_PRIVATE_ROOM: {
    statusCode: StatusCodes.CONFLICT,
    code: 'ALREADY_IN_PRIVATE_ROOM',
    message: '이미 다른 프라이빗 룸에 입장 중입니다.',
  },

  // 500
  INTERNAL_SERVER_ERROR: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버 오류가 발생했습니다.',
  },

  // 502
  GITHUB_API_ERROR: {
    statusCode: StatusCodes.BAD_GATEWAY,
    code: 'GITHUB_API_ERROR',
    message: 'GitHub API 오류가 발생했습니다.',
  },
  AI_API_ERROR: {
    statusCode: StatusCodes.BAD_GATEWAY,
    code: 'AI_API_ERROR',
    message: 'AI API 오류가 발생했습니다.',
  },
} as const satisfies Record<string, ErrorInfo>;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
