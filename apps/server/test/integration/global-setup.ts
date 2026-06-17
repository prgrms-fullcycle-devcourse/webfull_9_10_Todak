/*
 * 통합테스트 글로벌 셋업 (테스트 전체 시작 시 1회).
 *
 * 1) 임베디드 Postgres 를 로컬 프로세스로 기동
 * 2) prisma db push 로 현재 스키마를 그대로 반영
 * 3) (teardown) 테스트가 끝나면 PG 정지 + 데이터 디렉터리 정리
 *
 * 각 테스트 파일의 워커는 setup.ts 에서 이 PG 에 접속한다.
 */
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

import EmbeddedPostgres from 'embedded-postgres';

import {
  PG_DATA_DIR,
  PG_PASSWORD,
  PG_PORT,
  PG_USER,
  TEST_DATABASE_URL,
} from './db-config.js';

export default async function setup(): Promise<() => Promise<void>> {
  // 이전 실행이 비정상 종료돼 남은 데이터 디렉터리를 비우고 깨끗하게 시작
  rmSync(PG_DATA_DIR, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: PG_DATA_DIR,
    user: PG_USER,
    password: PG_PASSWORD,
    port: PG_PORT,
    persistent: false, // 종료 시 데이터 유지하지 않음
  });

  console.log(`[integration] embedded postgres 기동 중... (port ${PG_PORT})`);
  await pg.initialise();
  await pg.start();

  /*
   * 현재 schema.prisma 를 임시 DB 에 그대로 반영(마이그레이션 파일 없이 빠르게).
   * prisma.config.ts 가 .env(개발 DB)를 읽으므로, --url 로 테스트 DB 를 명시적으로
   * 덮어써서 개발 DB 를 절대 건드리지 않게 한다.
   */
  console.log('[integration] prisma db push 로 스키마 반영 중...');
  execFileSync(
    'pnpm',
    [
      'exec',
      'prisma',
      'db',
      'push',
      '--url',
      TEST_DATABASE_URL,
      '--accept-data-loss',
    ],
    { stdio: 'inherit' },
  );

  console.log('[integration] 준비 완료 ✅');

  return async () => {
    console.log('[integration] embedded postgres 정지 중...');
    await pg.stop();
    rmSync(PG_DATA_DIR, { recursive: true, force: true });
  };
}
