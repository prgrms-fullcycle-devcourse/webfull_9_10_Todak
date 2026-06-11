-- 동시성 버그 차단을 위한 UNIQUE 제약 2종.
-- 1) room_member: 같은 (room, user) 가 중복 가입되는 입장 race 차단
-- 2) repo: 같은 레포(full_name)가 두 룸에 연결되는 것을 차단 (webhook 이중등록 방지)

-- ── room_member ──────────────────────────────────────────────
-- 기존 중복 멤버 정리: (room_id, user_id) 당 1개만 남긴다.
-- 방장 행을 우선 보존하고, 그다음 먼저 가입한(joined_at) 행을 남긴다.
-- (UNIQUE INDEX 생성 전에 중복을 비워두지 않으면 생성이 실패함)
DELETE FROM "room_member" a
USING "room_member" b
WHERE a."room_id" = b."room_id"
  AND a."user_id" = b."user_id"
  AND a."id" <> b."id"
  AND (
    (b."is_host" AND NOT a."is_host")
    OR (a."is_host" = b."is_host" AND a."joined_at" > b."joined_at")
    OR (a."is_host" = b."is_host" AND a."joined_at" = b."joined_at" AND a.ctid > b.ctid)
  );

-- 기존 (room_id, user_id) 인덱스를 UNIQUE 로 승격
DROP INDEX "room_member_room_id_user_id_idx";
CREATE UNIQUE INDEX "room_member_room_id_user_id_key" ON "room_member"("room_id", "user_id");

-- ── repo ─────────────────────────────────────────────────────
-- 기존 중복 레포 정리: 같은 full_name 은 가장 먼저 만들어진(created_at) 1개만 남긴다.
-- (Todo 는 repo_id ON DELETE SET NULL 이라 보존됨)
DELETE FROM "repo" a
USING "repo" b
WHERE a."full_name" = b."full_name"
  AND a."id" <> b."id"
  AND (
    a."created_at" > b."created_at"
    OR (a."created_at" = b."created_at" AND a.ctid > b.ctid)
  );

-- 기존 full_name 인덱스를 UNIQUE 로 승격
DROP INDEX "repo_full_name_idx";
CREATE UNIQUE INDEX "repo_full_name_key" ON "repo"("full_name");
