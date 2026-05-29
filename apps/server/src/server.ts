import http from 'http';

import app from './app.js';
import { env } from './config/env.js';
import { startWorkers } from './jobs/workers/index.js';
import { prisma } from './lib/prisma.js';
import { initSocket } from './socket/index.js';

async function bootstrap() {
  await prisma.$connect();
  console.log('✅ Database connected');

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  await startWorkers();

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(
      `📄 OpenAPI docs: http://localhost:${env.PORT}/api/docs/openapi.json`,
    );
  });
}

bootstrap().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
