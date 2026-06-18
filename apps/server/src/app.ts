import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import {
  serve as swaggerServe,
  setup as swaggerSetup,
} from 'swagger-ui-express';

import apiRouter from './api/index.js';
import githubWebhookRouter from './api/webhooks/github.webhook.routes.js';
import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { generateOpenApiDocument } from './schema/openapi.js';

const app = express();

// 프록시(Railway 등) 뒤에서 실제 클라이언트 IP를 인식하도록 설정 (rate limit IP 기준에 필요)
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = env.CLIENT_URL.split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());

/*
 * GitHub Webhook 은 서명 검증을 위해 raw body 가 필요하므로
 * 전역 express.json 보다 먼저 raw 파서로 마운트한다.
 * limit: GitHub push 등 커밋 많은 페이로드도 흘리지 않도록 넉넉히(HMAC 검증 출처라 안전).
 */
app.use(
  '/webhooks/github',
  express.raw({ type: 'application/json', limit: '5mb' }),
  githubWebhookRouter,
);

/*
 * 본문 크기 상한 명시(기본 100kb) — 회의록 content_md 등 정상 입력은 충분히 커버하되
 * 비정상 대용량 바디로 인한 메모리 압박(DoS)을 차단한다.
 */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', apiRouter);

app.use('/api-docs', swaggerServe);
app.get('/api-docs', swaggerSetup(generateOpenApiDocument()));

app.use(errorMiddleware);

export default app;
