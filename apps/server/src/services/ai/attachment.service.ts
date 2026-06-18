import { randomUUID } from 'crypto';

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { s3 } from '../../lib/s3.js';

/*
 * 채팅 첨부(이미지/PDF) 스토리지 어댑터 + 허용 정책.
 *
 * 설계
 *   - 파일 바이너리는 서버를 통과하지 않는다. 업로드/다운로드 모두 클라이언트가
 *     S3 와 직접 주고받고, 서버는 presigned URL 발급과 검증만 담당한다.
 *   - 비공개(룸 멤버 전용) 자원이라 버킷은 private, URL 은 짧은 만료(5분)로 발급한다.
 *   - DB·멤버십 검증은 여기서 다루지 않는다 (호출부 컨트롤러/서비스 책임).
 */

// ── 허용 형식 / 용량 정책 (한곳에서 관리) ──────────────────────
const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const FILE_MIMES = ['application/pdf'];

const MB = 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * MB;
const MAX_FILE_SIZE = 25 * MB;

// 한 메시지에 붙일 수 있는 첨부 최대 개수
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

/*
 * presigned URL 만료.
 * - 업로드(PUT): 발급 직후 바로 쓰므로 짧게 (5분)
 * - 조회(GET): 채팅 스크롤 중 이미지가 만료돼 안 보이지 않게 넉넉히 (1시간)
 *   비공개 자원이지만 룸 멤버만 발급받으므로 이 정도 만료는 감수.
 *   (추후 CloudFront signed cookie 로 가면 매 URL 만료 부담을 덜 수 있음)
 */
const PRESIGN_UPLOAD_EXPIRES_SEC = 300;
const PRESIGN_DOWNLOAD_EXPIRES_SEC = 3600;

export type AttachmentType = 'image' | 'file';

// mime → 첨부 종류. 허용 목록에 없으면 null.
export function resolveAttachmentType(mime: string): AttachmentType | null {
  if (IMAGE_MIMES.includes(mime)) {
    return 'image';
  }

  if (FILE_MIMES.includes(mime)) {
    return 'file';
  }

  return null;
}

/*
 * mime/size 가 허용 정책에 맞는지 검증하고 첨부 종류를 돌려준다.
 * - 형식 미허용 → UNSUPPORTED_FILE_TYPE
 * - 용량 초과   → FILE_TOO_LARGE
 */
export function assertAllowedAttachment(
  mime: string,
  size: number,
): AttachmentType {
  const type = resolveAttachmentType(mime);
  if (type === null) {
    throw new AppError('UNSUPPORTED_FILE_TYPE');
  }

  const max = type === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (size <= 0 || size > max) {
    throw new AppError('FILE_TOO_LARGE');
  }

  return type;
}

/*
 * 업로드용 presigned PUT URL 발급. (key 는 룸 단위로 무작위 생성)
 * ContentType 을 박아 클라이언트가 선언한 형식 그대로 올리도록 강제한다.
 */
export async function createUploadUrl(
  roomId: string,
  mime: string,
): Promise<{ url: string; s3Key: string }> {
  const s3Key = `chat/${roomId}/${randomUUID()}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      ContentType: mime,
    }),
    { expiresIn: PRESIGN_UPLOAD_EXPIRES_SEC },
  );

  return { url, s3Key };
}

/*
 * S3 에 객체가 실제로 올라왔는지 확인하고 실제 size/mime 을 돌려준다.
 * 클라가 보낸 메타를 신뢰하지 않고, 업로드 사실과 실제 값을 서버가 재확인하는 용도.
 * 객체가 없으면(NotFound 등) null.
 */
export async function headAttachment(
  s3Key: string,
): Promise<{ size: number; mime: string } | null> {
  try {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: s3Key }),
    );

    return { size: head.ContentLength ?? 0, mime: head.ContentType ?? '' };
  } catch {
    return null;
  }
}

/*
 * 조회용 presigned GET URL 발급.
 * 브라우저에서 바로 표시되도록 inline, 다운로드 시 원본 파일명으로 받도록
 * Content-Disposition 을 지정한다 (RFC 5987 형식이라 한글 파일명도 안전).
 */
export async function createDownloadUrl(
  s3Key: string,
  originalName: string,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(
        originalName,
      )}`,
    }),
    { expiresIn: PRESIGN_DOWNLOAD_EXPIRES_SEC },
  );
}
