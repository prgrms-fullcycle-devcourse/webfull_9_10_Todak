import { ZodError } from 'zod';

import { AppError } from '../errors/AppError.js';

/*
 * socket 이벤트 핸들러에서 잡은 에러를, 클라이언트로 보낼 { code, message } 로 변환한다.
 * 핸들러마다 똑같이 반복하던 catch 분기를 한곳으로 모은 것.
 *
 *   - AppError : 우리가 정의한 도메인 에러   → 그 code/message 그대로 사용
 *   - ZodError : 입력(zod) 검증 실패         → 'BAD_REQUEST'
 *   - 그 외    : 예상 못 한 에러             → 호출부가 넘긴 fallback 사용
 */
export function toSocketError(
  err: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): { code: string; message: string } {
  const code =
    err instanceof AppError
      ? err.code
      : err instanceof ZodError
        ? 'BAD_REQUEST'
        : fallbackCode;

  const message = err instanceof Error ? err.message : fallbackMessage;

  return { code, message };
}
