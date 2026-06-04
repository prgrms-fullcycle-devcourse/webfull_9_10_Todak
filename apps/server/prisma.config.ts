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

// CI의 migration drift 검사(prisma migrate diff --from-migrations)는 마이그레이션을
// 임시 DB에 재생해야 하므로 shadow DB가 필요. env가 설정된 경우에만 추가(로컬 dev 영향 없음).
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
