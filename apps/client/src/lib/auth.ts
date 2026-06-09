const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const AUTH_TOKEN_STORAGE_KEY = 'todak.auth.token';
export const AUTH_TOKEN_COOKIE_NAME = AUTH_TOKEN_STORAGE_KEY;

interface AuthApiResponse<TData> {
  success: boolean;
  data?: TData;
}

interface RefreshAuthTokenResponse {
  accessToken: string;
}

export interface AuthUser {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string;
}

export interface AuthTokenPayload extends AuthUser {
  exp?: number;
  iat?: number;
}

export function getGithubLoginUrl() {
  return `${getApiBaseUrl()}/auth/github`;
}

export function getAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token =
    window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? getAuthTokenCookie();

  if (token === null) {
    return null;
  }

  const payload = decodeAuthToken(token);
  if (payload === null || isExpired(payload)) {
    clearAuthToken();
    return null;
  }

  if (window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) === null) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }

  saveAuthTokenCookie(token);

  return token;
}

export function saveAuthToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  saveAuthTokenCookie(token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  clearAuthTokenCookie();
}

export async function refreshAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const body =
      (await response.json()) as AuthApiResponse<RefreshAuthTokenResponse>;
    const token = body.data?.accessToken;

    if (typeof token !== 'string' || token === '') {
      return null;
    }

    saveAuthToken(token);

    return token;
  } catch {
    return null;
  }
}

export async function logoutAuth() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearAuthToken();
  }
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

function getApiBaseUrl() {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');

  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

function getAuthTokenCookie() {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookiePrefix = `${AUTH_TOKEN_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split('; ')
    .find(value => value.startsWith(cookiePrefix));

  if (cookie === undefined) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice(cookiePrefix.length));
  } catch {
    return null;
  }
}

function saveAuthTokenCookie(token: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const maxAge = getTokenCookieMaxAge(token);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const maxAgeAttribute =
    maxAge === null ? '' : `; Max-Age=${Math.max(0, maxAge)}`;

  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; Path=/; SameSite=Lax${maxAgeAttribute}${secure}`;
}

function clearAuthTokenCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : '';

  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function getTokenCookieMaxAge(token: string) {
  const payload = decodeAuthToken(token);

  if (typeof payload?.exp !== 'number') {
    return null;
  }

  return payload.exp - Math.floor(Date.now() / 1000);
}
