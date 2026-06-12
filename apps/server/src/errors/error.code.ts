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
  MINUTES_NO_CONTENT: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'MINUTES_NO_CONTENT',
    message: '다듬을 회의록 본문이 비어 있습니다.',
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
  WEBHOOK_SIGNATURE_INVALID: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'WEBHOOK_SIGNATURE_INVALID',
    message: 'Webhook 서명 검증에 실패했습니다.',
  },
  GITHUB_REAUTH_REQUIRED: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'GITHUB_REAUTH_REQUIRED',
    message: 'GitHub 인증이 만료되었습니다. 다시 로그인해주세요.',
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
  MEETING_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'MEETING_NOT_FOUND',
    message: '해당 회의(Meeting) 정보를 찾을 수 없습니다.',
  },
  MINUTES_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'MINUTES_NOT_FOUND',
    message: '해당 회의록을 찾을 수 없거나 접근 권한이 없습니다.',
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
  ROOM_MEMBER_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'ROOM_MEMBER_NOT_FOUND',
    message: '룸 멤버를 찾을 수 없습니다.',
  },
  ROOM_REPO_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'ROOM_REPO_NOT_FOUND',
    message: '룸에 연결된 레포지토리가 없습니다.',
  },
  TODO_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'TODO_NOT_FOUND',
    message: 'Todo를 찾을 수 없습니다.',
  },
  CHAT_MESSAGE_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'CHAT_MESSAGE_NOT_FOUND',
    message: '채팅 메시지를 찾을 수 없습니다.',
  },

  // 405
  PR_NOT_MERGEABLE: {
    statusCode: StatusCodes.METHOD_NOT_ALLOWED,
    code: 'PR_NOT_MERGEABLE',
    message: '머지할 수 없는 PR입니다. (드래프트/체크 미통과/이미 닫힘 등)',
  },

  // 409
  CONFLICT: {
    statusCode: StatusCodes.CONFLICT,
    code: 'CONFLICT',
    message: '이미 존재하는 리소스입니다.',
  },
  PR_MERGE_CONFLICT: {
    statusCode: StatusCodes.CONFLICT,
    code: 'PR_MERGE_CONFLICT',
    message: '충돌 또는 HEAD 변경으로 머지에 실패했습니다.',
  },
  ALREADY_IN_PRIVATE_ROOM: {
    statusCode: StatusCodes.CONFLICT,
    code: 'ALREADY_IN_PRIVATE_ROOM',
    message: '이미 다른 프라이빗 룸에 입장 중입니다.',
  },
  ALREADY_JOINED: {
    statusCode: StatusCodes.CONFLICT,
    code: 'ALREADY_JOINED',
    message: '이미 참여한 룸입니다.',
  },
  REPO_ALREADY_IN_USE: {
    statusCode: StatusCodes.CONFLICT,
    code: 'REPO_ALREADY_IN_USE',
    message: '이미 다른 룸에서 사용 중인 레포지토리입니다.',
  },
  ROOM_FULL: {
    statusCode: StatusCodes.CONFLICT,
    code: 'ROOM_FULL',
    message: '룸 정원이 초과되었습니다.',
  },
  ROOM_MEMBER_ALREADY_SET_UP: {
    statusCode: StatusCodes.CONFLICT,
    code: 'ROOM_MEMBER_ALREADY_SET_UP',
    message:
      '이미 캐릭터/역할이 설정되어 있습니다. 프로필 수정을 이용해주세요.',
  },
  ROOM_MEMBER_NOT_SET_UP: {
    statusCode: StatusCodes.CONFLICT,
    code: 'ROOM_MEMBER_NOT_SET_UP',
    message: '먼저 캐릭터/역할 설정을 완료해주세요.',
  },
  INVALID_INVITE_CODE: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'INVALID_INVITE_CODE',
    message: '유효하지 않은 초대 코드입니다.',
  },
  MINUTES_GENERATING: {
    statusCode: StatusCodes.CONFLICT,
    code: 'MINUTES_GENERATING',
    message: 'AI가 회의록을 생성 중입니다. 완료 후 다시 시도해주세요.',
  },
  MINUTES_ALREADY_EXISTS: {
    statusCode: StatusCodes.CONFLICT,
    code: 'MINUTES_ALREADY_EXISTS',
    message: '해당 회의에 대한 회의록이 이미 존재합니다.',
  },

  // 413
  FILE_TOO_LARGE: {
    statusCode: StatusCodes.REQUEST_TOO_LONG,
    code: 'FILE_TOO_LARGE',
    message: '첨부 파일 용량이 허용 범위를 초과했습니다.',
  },

  // 415
  UNSUPPORTED_FILE_TYPE: {
    statusCode: StatusCodes.UNSUPPORTED_MEDIA_TYPE,
    code: 'UNSUPPORTED_FILE_TYPE',
    message: '지원하지 않는 파일 형식입니다. (이미지 또는 PDF만 가능)',
  },

  // 422
  PR_REVIEW_NOT_ALLOWED: {
    statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
    code: 'PR_REVIEW_NOT_ALLOWED',
    message: '리뷰를 등록할 수 없습니다. (본인 PR 승인 불가 등)',
  },

  // 429
  TOO_MANY_REQUESTS: {
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    code: 'TOO_MANY_REQUESTS',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },

  // 500
  INTERNAL_SERVER_ERROR: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버 오류가 발생했습니다.',
  },
  INVITE_CODE_GENERATION_FAILED: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'INVITE_CODE_GENERATION_FAILED',
    message: '초대 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
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
