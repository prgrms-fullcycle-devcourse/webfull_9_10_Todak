import http from 'http';

import app from './app';
import { env } from './config/env';
import { startWorkers } from './jobs/workers';
import { prisma } from './lib/prisma';
import { initSocket } from './socket';

async function bootstrap() {
  await prisma.$connect();
  console.log('✅ Database connected');

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  startWorkers();

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
