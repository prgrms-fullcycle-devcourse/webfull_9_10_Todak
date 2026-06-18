import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ override: true, path: process.env.DOTENV_CONFIG_PATH });

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(4000),

  // pino 로그 레벨 (trace/debug/info/warn/error/fatal/silent)
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),

  ANTHROPIC_API_KEY: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  CLIENT_URL: z.string().default('http://localhost:3000'),

  WEBHOOK_SECRET: z.string().min(1),

  // 채팅 첨부(이미지/PDF) 저장용 S3 — presigned URL 발급에 사용
  AWS_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  /*
   * logger 는 env(LOG_LEVEL 등)에 의존하므로, env 검증 실패 시점엔 아직 못 쓴다.
   * 이 부팅 단계 한정으로 console.error 를 그대로 사용한다.
   */
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
