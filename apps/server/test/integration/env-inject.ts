/*
 * 통합테스트 환경 변수 주입 (★ prisma/env import 보다 반드시 먼저 평가되어야 함)
 *
 * env.ts 는 import 시점에 dotenv.config({ override:true, path:DOTENV_CONFIG_PATH }) 로
 * 환경 변수를 채운다. 여기서 DOTENV_CONFIG_PATH 를 "존재하지 않는 경로"로 지정해
 * .env(=개발 DB) 덮어쓰기를 막고, 아래에서 넣어준 테스트용 값이 그대로 살아남게 한다.
 *
 * setup.ts 에서 이 파일을 가장 먼저 import 하므로, ESM 평가 순서상
 * 여기서 process.env 를 세팅한 뒤에 prisma → env 가 로드된다.
 */
import { fileURLToPath } from 'node:url';

import { TEST_DATABASE_URL } from './db-config.js';

// 존재하지 않는 경로 → dotenv 가 .env 를 읽지 않아 아래 값들이 보존된다.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(
  new URL('./__no_env_file__', import.meta.url),
);

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

// 아래는 env 스키마 검증 통과용 더미값 (실제 외부 연결은 하지 않음)
process.env.GITHUB_CLIENT_ID ??= 'test';
process.env.GITHUB_CLIENT_SECRET ??= 'test';
process.env.GITHUB_CALLBACK_URL ??=
  'http://localhost:4000/auth/github/callback';
process.env.ANTHROPIC_API_KEY ??= 'test';
process.env.JWT_SECRET ??= 'test_jwt_secret_test_jwt_secret_test';
process.env.WEBHOOK_SECRET ??= 'test';
process.env.AWS_REGION ??= 'ap-northeast-2';
process.env.S3_BUCKET ??= 'test-bucket';
process.env.AWS_ACCESS_KEY_ID ??= 'test';
process.env.AWS_SECRET_ACCESS_KEY ??= 'test';
