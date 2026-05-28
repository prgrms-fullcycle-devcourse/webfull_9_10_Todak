const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const AUTH_TOKEN_STORAGE_KEY = 'todak.auth.token';

export interface AuthUser {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string;
}

interface AuthTokenPayload extends AuthUser {
  exp?: number;
  iat?: number;
}

export function getGithubLoginUrl() {
  return `${API_BASE_URL}/api/auth/github`;
}

export function getAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token === null) {
    return null;
  }

  const payload = decodeAuthToken(token);
  if (payload === null || isExpired(payload)) {
    clearAuthToken();
    return null;
  }

  return token;
}

export function saveAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredAuthUser() {
  const token = getAuthToken();

  return token === null ? null : decodeAuthToken(token);
}

export function decodeAuthToken(token: string): AuthTokenPayload | null {
  const [, payload] = token.split('.');
  if (payload === undefined || payload === '') {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const decoded = globalThis.atob(padded);
    const parsed = JSON.parse(decoded) as Partial<AuthTokenPayload>;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.githubId !== 'number' ||
      typeof parsed.login !== 'string' ||
      typeof parsed.avatarUrl !== 'string'
    ) {
      return null;
    }

    return {
      id: parsed.id,
      githubId: parsed.githubId,
      login: parsed.login,
      avatarUrl: parsed.avatarUrl,
      exp: parsed.exp,
      iat: parsed.iat,
    };
  } catch {
    return null;
  }
}

function isExpired(payload: AuthTokenPayload) {
  return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
}
