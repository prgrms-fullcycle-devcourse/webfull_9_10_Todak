/*
  Warnings:

  - You are about to drop the column `role` on the `room_member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "room_member" DROP COLUMN "role",
ADD COLUMN     "detailed_role" TEXT,
ADD COLUMN     "roles" TEXT[];

-- AlterTable
ALTER TABLE "todo" ALTER COLUMN "github_issue_number" DROP NOT NULL;
