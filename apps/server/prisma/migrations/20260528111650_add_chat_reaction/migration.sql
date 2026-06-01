-- AlterTable
ALTER TABLE "todo" ALTER COLUMN "labels" DROP DEFAULT;

-- CreateTable
CREATE TABLE "chat_reaction" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_reaction_message_id_user_id_emoji_key" ON "chat_reaction"("message_id", "user_id", "emoji");

-- AddForeignKey
ALTER TABLE "chat_reaction" ADD CONSTRAINT "chat_reaction_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_reaction" ADD CONSTRAINT "chat_reaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
