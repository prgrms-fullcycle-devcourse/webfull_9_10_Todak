/*
 * 테스트 환경 변수 주입
 *
 * env.ts 는 import 시점에 환경 변수를 검증하고, 누락되면 process.exit(1) 한다.
 * 일부 테스트(graceful-shutdown 등)는 workers/socket 의 실제 모듈 그래프를
 * 불러오면서 prisma → env 를 함께 로드하므로, .env 없이 도는 CI 에서는
 * 검증이 실패한다. 실제 연결은 하지 않으므로 형식만 맞는 더미 값을 넣어준다.
 *
 * env.ts 의 dotenv.config({ override: true }) 때문에, 로컬에서 .env 가 있으면
 * 실제 값이 이 더미를 덮어쓴다(= 로컬 동작 불변). CI 에는 .env 가 없어 더미가 유지된다.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.GITHUB_CLIENT_ID ??= 'test';
process.env.GITHUB_CLIENT_SECRET ??= 'test';
process.env.GITHUB_CALLBACK_URL ??=
  'http://localhost:4000/auth/github/callback';
process.env.ANTHROPIC_API_KEY ??= 'test';
process.env.JWT_SECRET ??= 'test_jwt_secret_test_jwt_secret_test';
process.env.WEBHOOK_SECRET ??= 'test';
