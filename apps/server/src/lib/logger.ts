import { pino } from 'pino';

import { env } from '../config/env.js';

/*
 * 전역 구조화 로거(pino).
 * - production: JSON 출력 → 로그 수집/검색/집계 가능
 * - development: pino-pretty 로 사람이 읽기 좋은 컬러 출력
 * - test: silent(기본 LOG_LEVEL=info 와 무관하게 잡음 억제)
 * 레벨은 env.LOG_LEVEL 로 제어한다.
 *
 * 사용 예) logger.info({ jobId }, 'job started') — 메시지 + 구조화 필드.
 * 모듈별 맥락이 필요하면 logger.child({ module: 'webhook' }) 로 자식 로거를 만든다.
 */
const isProd = env.NODE_ENV === 'production';
/*
 * vitest 는 .env 의 NODE_ENV(override) 영향으로 env.NODE_ENV 가 test 가 아닐 수 있어
 * VITEST 플래그도 함께 본다(테스트 중 로그 잡음·pino-pretty 워커 트랜스포트 회피).
 */
const isTest = env.NODE_ENV === 'test' || process.env.VITEST !== undefined;

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  // dev 에서만 pino-pretty transport 사용(프로덕션은 JSON 원본 유지)
  ...(isProd || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
        },
      }),
});
