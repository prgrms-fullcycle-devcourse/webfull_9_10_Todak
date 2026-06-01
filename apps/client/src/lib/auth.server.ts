import { cookies } from 'next/headers';

import { AUTH_TOKEN_COOKIE_NAME, decodeAuthToken } from './auth';

export async function getServerAuthToken() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

  if (rawToken === undefined || rawToken === '') {
    return null;
  }

  const token = decodeCookieValue(rawToken);
  const payload = decodeAuthToken(token);

  if (payload === null || isExpired(payload.exp)) {
    return null;
  }

  return token;
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isExpired(exp?: number) {
  return typeof exp === 'number' && exp * 1000 <= Date.now();
}
