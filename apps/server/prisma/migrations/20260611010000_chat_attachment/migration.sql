-- 채팅 첨부 파일(이미지/PDF) 지원.
-- 1) 첨부만 있는 메시지를 허용하기 위해 content 를 nullable 로 변경
-- 2) 첨부 메타 테이블(chat_attachment) 추가 — 실제 바이너리는 S3, 여기엔 s3_key 등 메타만

-- ── chat_message.content nullable ────────────────────────────
ALTER TABLE "chat_message" ALTER COLUMN "content" DROP NOT NULL;

-- ── chat_attachment ──────────────────────────────────────────
CREATE TABLE "chat_attachment" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "s3_key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_attachment_pkey" PRIMARY KEY ("id")
);

-- 한 메시지에 여러 첨부 가능 (메시지 기준 조회용 인덱스)
CREATE INDEX "chat_attachment_message_id_idx" ON "chat_attachment"("message_id");

-- 메시지 삭제 시 첨부 메타도 함께 삭제 (ON DELETE CASCADE)
ALTER TABLE "chat_attachment" ADD CONSTRAINT "chat_attachment_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
