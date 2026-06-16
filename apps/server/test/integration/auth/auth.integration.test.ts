/*
 * [영역 1] 인증 게이트 (HTTP 통합)
 * 모든 보호 엔드포인트의 전제: 토큰 없으면 401, 유효 JWT 면 통과.
 */
import { describe, expect, it } from 'vitest';

import { createUserWithToken, request } from '../app-harness.js';

describe('인증 게이트 (integration)', () => {
  it('토큰 없이 보호 엔드포인트 호출 → 401 UNAUTHORIZED', async () => {
    const res = await request().get('/api/rooms');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: 'UNAUTHORIZED' });
  });

  it('형식이 잘못된 Authorization 헤더 → 401', async () => {
    const res = await request()
      .get('/api/rooms')
      .set('Authorization', 'Bearer');

    expect(res.status).toBe(401);
  });

  it('위조된 토큰 → 400 INVALID_TOKEN', async () => {
    const res = await request()
      .get('/api/rooms')
      .set('Authorization', 'Bearer not.a.real.token');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('유효한 JWT 면 정상 접근(200)', async () => {
    const user = await createUserWithToken();
    const res = await request()
      .get('/api/rooms')
      .set('Authorization', user.auth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
