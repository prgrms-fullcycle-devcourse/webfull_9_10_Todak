-- 이슈 유일성 기준을 룸(room) → 레포(repo)로 전환한다.
-- 레포 연결 해제/교체 시 Todo 는 보존하되, 새 레포의 이슈번호가 옛 Todo 와
-- 충돌하지 않도록 repo_id 를 기준으로 유일성을 건다.

-- 1. Todo 에 repo_id 컬럼 추가 (nullable: 회의 전용 Todo 는 어느 레포에도 안 묶임)
ALTER TABLE "todo" ADD COLUMN "repo_id" UUID;

-- 2. 백필: 이슈 기반 Todo 는 현재 룸에 연결된 레포로 채운다 (회의 전용은 null 유지)
UPDATE "todo" t
SET "repo_id" = r."id"
FROM "repo" r
WHERE r."room_id" = t."room_id"
  AND t."github_issue_number" IS NOT NULL;

-- 3. 유일성 기준 교체: (room_id, github_issue_number) → (repo_id, github_issue_number)
DROP INDEX "todo_room_id_github_issue_number_key";
CREATE UNIQUE INDEX "todo_repo_id_github_issue_number_key" ON "todo"("repo_id", "github_issue_number");

-- 4. room_id 단독 조회용 인덱스 (기존 복합 unique 가 커버하던 prefix 보강)
CREATE INDEX "todo_room_id_idx" ON "todo"("room_id");

-- 5. FK: 레포 해제/교체로 repo 가 삭제되면 Todo 는 보존하고 연결만 끊는다 (SET NULL)
ALTER TABLE "todo" ADD CONSTRAINT "todo_repo_id_fkey"
  FOREIGN KEY ("repo_id") REFERENCES "repo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
