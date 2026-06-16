import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/*
 * 통합테스트 전용 설정.
 * - 실제(임베디드) Postgres 에 붙는 *.integration.test.ts 만 대상으로 한다.
 * - globalSetup 에서 PG 를 1회 기동/정리, setup 에서 워커별 접속 + 테이블 격리.
 * - 기존 유닛 테스트(vitest.config.ts)와 분리되어 빠른 유닛 테스트 속도를 해치지 않는다.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.integration.test.ts'],
    globalSetup: ['./test/integration/global-setup.ts'],
    setupFiles: ['./test/integration/setup.ts'],
    // 같은 임베디드 DB 를 공유하므로 파일 간 병렬 실행을 끄고 순차로 돌린다.
    fileParallelism: false,
    // PG 기동 + db push 가 있어 첫 테스트는 다소 느릴 수 있다.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
