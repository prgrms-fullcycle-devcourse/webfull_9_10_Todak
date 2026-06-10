-- 기존 중복 참가자 행 정리: (meeting_id, user_id) 당 1개만 남기고 삭제
-- (동시 종료 race 로 생긴 중복을 비워두지 않으면 아래 UNIQUE INDEX 생성이 실패함)
DELETE FROM "meeting_participant" a
USING "meeting_participant" b
WHERE a."meeting_id" = b."meeting_id"
  AND a."user_id" = b."user_id"
  AND a.ctid > b.ctid;

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participant_meeting_id_user_id_key" ON "meeting_participant"("meeting_id", "user_id");
