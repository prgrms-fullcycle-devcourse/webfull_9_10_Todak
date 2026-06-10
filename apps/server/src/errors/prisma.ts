import { Prisma } from '../generated/prisma/client/index.js';

/*
 * Prisma 에러 판별 헬퍼.
 * 서비스마다 `error instanceof Prisma.PrismaClientKnownRequestError && error.code === '...'`
 * 를 직접 풀어 쓰던 것을 한곳에 모아 에러 처리 방식을 일관되게 한다.
 */

// 특정 Prisma 에러 코드인지 확인 (P2002, P2025 등)
export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

// unique 제약 위반(P2002) — 동시 생성 레이스/중복 키 등
export function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaErrorCode(error, 'P2002');
}

// 대상 레코드 없음(P2025) — update/delete 시 행이 사라진 경우
export function isRecordNotFoundError(error: unknown): boolean {
  return isPrismaErrorCode(error, 'P2025');
}
