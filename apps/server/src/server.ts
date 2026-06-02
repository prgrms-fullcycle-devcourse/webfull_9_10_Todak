import http from 'http';

import app from './app.js';
import { env } from './config/env.js';
import { closeWorkers, startWorkers } from './jobs/workers/index.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { closeSocket, initSocket } from './socket/index.js';

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

  /*
   * ────────────────────────────────────────────────────────────
   * Graceful shutdown
   * Railway는 재배포 시 SIGTERM을 보낸다. 강제 종료되면 처리 중인 요청,
   * BullMQ 잡, DB/Redis 연결이 정리되지 않으므로 아래 순서로 안전하게 정리한다.
   *   1. httpServer.close() : 새 요청 차단 (기존 요청은 끝날 때까지 유지)
   *   2. closeSocket()      : 열린 소켓 클라이언트 연결 종료
   *   3. closeWorkers()     : 처리 중인 잡이 끝날 때까지 기다린 뒤 worker 종료
   *   4. prisma.$disconnect : DB 연결 종료
   *   5. redis.quit()       : Redis 연결 종료
   * ────────────────────────────────────────────────────────────
   */
  let isShuttingDown = false;

  async function shutdown(signal: string) {
    // 셧다운 도중 두 번째 시그널이 와도 중복 실행하지 않는다
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    console.log(`\n📥 ${signal} 수신, graceful shutdown 시작...`);

    try {
      // 1. 새 요청 차단 + 기존 요청 드레인 대기
      await new Promise<void>((resolve, reject) => {
        httpServer.close(err => (err ? reject(err) : resolve()));
        // 이미 열린 소켓 연결을 끊어줘야 httpServer가 드레인될 수 있다
        closeSocket();
      });
      console.log('✅ HTTP server closed');

      // 2. 처리 중인 잡 마무리 후 worker 종료
      await closeWorkers();

      // 3. DB 연결 종료
      await prisma.$disconnect();
      console.log('✅ Database disconnected');

      // 4. Redis 연결 종료
      await redis.quit();
      console.log('✅ Redis disconnected');

      console.log('👋 Graceful shutdown 완료');
      process.exit(0);
    } catch (err) {
      console.error('❌ Graceful shutdown 중 오류:', err);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
