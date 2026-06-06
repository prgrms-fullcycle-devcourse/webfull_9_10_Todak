-- DropIndex
DROP INDEX "todo_room_id_github_issue_number_idx";

-- CreateIndex
CREATE UNIQUE INDEX "todo_room_id_github_issue_number_key" ON "todo"("room_id", "github_issue_number");
