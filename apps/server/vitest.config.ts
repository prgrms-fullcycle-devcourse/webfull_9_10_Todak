import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // 통합테스트(*.integration.test.ts)는 실제 DB 가 필요하므로 유닛 실행에서 제외.
    // (vitest.integration.config.ts 로 별도 실행)
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    setupFiles: ['./test/unit/setup.ts'],
  },
});
