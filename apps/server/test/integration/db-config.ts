/*
 * 통합테스트용 임시 Postgres 접속 정보.
 *
 * globalSetup(=PG 기동 + prisma db push)과 setup(=워커가 prisma 로 접속)이
 * 동일한 값을 써야 하므로 한곳에 모아둔다.
 * 포트/계정/DB명을 고정해 DATABASE_URL 을 정적으로 만든다(개발 DB와 분리).
 *
 * ⚠️ 앱 코드(env/prisma 등)를 import 하지 말 것.
 *    이 모듈은 env.ts 로드 이전에 쓰여야 하므로 의존성이 없어야 한다.
 */
import { fileURLToPath } from 'node:url';

export const PG_USER = 'postgres';
export const PG_PASSWORD = 'postgres';
export const PG_PORT = 54329; // 개발용 5432 와 겹치지 않게
export const PG_DATABASE = 'postgres'; // initialise 직후 생성되는 기본 DB

// 임베디드 PG 데이터 디렉터리 (test/integration/.pg-data). gitignore 대상.
export const PG_DATA_DIR = fileURLToPath(
  new URL('./.pg-data', import.meta.url),
);

export const TEST_DATABASE_URL = `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DATABASE}`;
