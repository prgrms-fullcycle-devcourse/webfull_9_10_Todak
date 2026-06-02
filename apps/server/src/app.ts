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
import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { generateOpenApiDocument } from './schema/openapi.js';

const app = express();

// 프록시(Railway 등) 뒤에서 실제 클라이언트 IP를 인식하도록 설정 (rate limit IP 기준에 필요)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', apiRouter);

app.use('/api-docs', swaggerServe);
app.get('/api-docs', swaggerSetup(generateOpenApiDocument()));

app.use(errorMiddleware);

export default app;
