import { S3Client } from '@aws-sdk/client-s3';

import { env } from '../config/env.js';

/*
 * 채팅 첨부(이미지/PDF) 저장용 S3 클라이언트 싱글톤.
 * 자격증명은 env 로만 주입한다 (서버가 Railway = AWS 외부라 IAM 역할을 못 쓰고
 * 전용 IAM 사용자의 액세스 키로 접근).
 */
export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
