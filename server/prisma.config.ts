import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.join(rootDir, '.env') });

// 마이그레이션은 DIRECT_DATABASE_URL 사용 (connection pooling 회피)
const databaseUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://localhost:5432/todak?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
