/*
 * userId 당 활성 소켓 1개(last wins)를 추적한다.
 * 단일 서버 프로세스 기준 in-memory Map — 멀티 인스턴스 배포 시 Redis adapter 등으로 확장 필요.
 */
const activeSocketByUserId = new Map<string, string>();

/**
 * 새 소켓을 해당 userId의 활성 세션으로 등록한다.
 * @returns 교체 대상이 되는 이전 소켓 id (없거나 동일 id면 null)
 */
export function claimActiveSession(
  userId: string,
  socketId: string,
): string | null {
  const previousSocketId = activeSocketByUserId.get(userId);

  activeSocketByUserId.set(userId, socketId);

  if (previousSocketId === undefined || previousSocketId === socketId) {
    return null;
  }

  return previousSocketId;
}

/**
 * disconnect 시 이 소켓이 여전히 활성 세션인지 확인하고, 맞으면 등록을 해제한다.
 * @returns away/프라이빗룸 정리 등 disconnect 후처리를 수행해야 하면 true
 */
export function releaseActiveSession(
  userId: string,
  socketId: string,
): boolean {
  if (activeSocketByUserId.get(userId) !== socketId) {
    return false;
  }

  activeSocketByUserId.delete(userId);
  return true;
}

export function hasActiveSession(userId: string): boolean {
  return activeSocketByUserId.has(userId);
}

export function clearAllActiveSessions(): void {
  activeSocketByUserId.clear();
}
