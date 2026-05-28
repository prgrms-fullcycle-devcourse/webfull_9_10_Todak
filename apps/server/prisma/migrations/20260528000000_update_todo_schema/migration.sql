/*
  Warnings:

  - You are about to drop the column `date` on the `todo` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `todo` table. All the data in the column will be lost.
  - Made the column `room_id` on table `todo` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `title` to the `todo` table without a default value. This step will fail if there are existing rows in the table.

*/
-- DropForeignKey
ALTER TABLE "todo" DROP CONSTRAINT IF EXISTS "todo_user_id_fkey";

-- DropForeignKey
ALTER TABLE "todo" DROP CONSTRAINT IF EXISTS "todo_room_id_fkey";

-- AlterTable: drop old columns, rename user_id → assignee_id, make room_id NOT NULL, add new columns
ALTER TABLE "todo"
  DROP COLUMN IF EXISTS "date",
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "todo"
  ADD COLUMN "assignee_id" UUID,
  ADD COLUMN "minutes_id" UUID,
  ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "body" TEXT,
  ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Remove the temporary DEFAULT on title (optional: keeps schema clean)
ALTER TABLE "todo" ALTER COLUMN "title" DROP DEFAULT;

-- Make room_id NOT NULL
ALTER TABLE "todo" ALTER COLUMN "room_id" SET NOT NULL;

-- AddForeignKey: room
ALTER TABLE "todo" ADD CONSTRAINT "todo_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: assignee (user)
ALTER TABLE "todo" ADD CONSTRAINT "todo_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: minutes
ALTER TABLE "todo" ADD CONSTRAINT "todo_minutes_id_fkey"
  FOREIGN KEY ("minutes_id") REFERENCES "minutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
