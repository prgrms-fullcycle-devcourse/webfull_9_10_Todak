import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ override: true });

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),

  ANTHROPIC_API_KEY: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  CLIENT_URL: z.string().url().default('http://localhost:3000'),

  WEBHOOK_SECRET: z.string().min(1),

  // 채팅 첨부(이미지/PDF) 저장용 S3 — presigned URL 발급에 사용
  AWS_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
