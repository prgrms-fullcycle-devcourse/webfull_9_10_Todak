-- CreateIndex
CREATE INDEX "room_member_room_id_user_id_idx" ON "room_member"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "room_member_user_id_idx" ON "room_member"("user_id");

-- CreateIndex
CREATE INDEX "repo_room_id_idx" ON "repo"("room_id");

-- CreateIndex
CREATE INDEX "repo_full_name_idx" ON "repo"("full_name");

-- CreateIndex
CREATE INDEX "chat_message_room_id_private_room_id_created_at_idx" ON "chat_message"("room_id", "private_room_id", "created_at");

-- CreateIndex
CREATE INDEX "minutes_room_id_created_at_idx" ON "minutes"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "todo_room_id_github_issue_number_idx" ON "todo"("room_id", "github_issue_number");

-- CreateIndex
CREATE INDEX "todo_assignee_id_idx" ON "todo"("assignee_id");

-- CreateIndex
CREATE INDEX "notification_room_id_user_id_idx" ON "notification"("room_id", "user_id");
