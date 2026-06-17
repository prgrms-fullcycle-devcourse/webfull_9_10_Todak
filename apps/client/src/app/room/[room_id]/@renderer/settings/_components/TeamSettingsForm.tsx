'use client';

import type { RoomMembers, RoomProfile } from '@/services/rooms/model';
import { Button, Avatar } from '@heroui/react';
import { useState } from 'react';

interface TeamSettingsFormProps {
  myRoomInfo?: RoomProfile;
  roomMembers: RoomMembers;
  roomID: string;
}

export default function TeamSettingsForm({
  myRoomInfo,
  roomMembers,
  roomID,
}: TeamSettingsFormProps) {
  const [searchUsername, setSearchUsername] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canEdit = myRoomInfo?.is_host === true;

  // 팀원 추가 핸들러
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !searchUsername.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(
      `@${searchUsername} 님에게 깃허브 레포지토리 및 팀 초대장을 전송했습니다.`,
    );
    setSearchUsername('');
  };

  // 팀원 추방 핸들러
  const handleKickMember = (memberID: string, githubUsername: string) => {
    if (!canEdit) return;

    const confirmKick = window.confirm(
      `정말 @${githubUsername} 팀원을 이 프로젝트 룸 및 GitHub 레포지토리에서 완전히 추방하시겠습니까?`,
    );
    if (!confirmKick) return;

    setSuccessMessage(
      `@${githubUsername} 팀원이 성공적으로 추방 처리되었습니다.`,
    );
  };

  return (
    <section
      className="scroll-mt-6 rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel"
      id="team-management"
    >
      <p className="todak-section-label text-todak-coral-500">TEAM</p>
      <h2 className="mt-2 text-lg font-black text-foreground">팀원 관리</h2>

      {!canEdit && (
        <p className="mt-4 rounded-xl bg-background px-3.5 py-3 text-[11px] font-bold text-muted">
          팀원 추가 및 추방 권한은 방장(Owner)에게만 제공됩니다.
        </p>
      )}

      {/* 협업자 초대 섹션 */}
      {canEdit && (
        <form
          onSubmit={handleAddMember}
          className="mt-5 border-b border-border pb-6"
        >
          <p className="text-xs font-black text-slate-700">협업자 초대</p>
          <p className="mt-1 text-[11px] font-bold leading-5 text-muted">
            함께 개발할 팀원의 GitHub 유저네임(Username)을 입력하여 이
            스페이스와 GitHub 레포지토리에 동시에 초대합니다.
          </p>

          <div className="mt-3 flex gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              placeholder="GitHub 유저네임 입력 (예: Songjh0)"
              className="todak-input h-9 flex-1 rounded-xl px-3.5 py-0 text-xs font-semibold"
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
            />
            <Button
              type="submit"
              isDisabled={!searchUsername.trim()}
              className="h-9 rounded-xl bg-foreground px-4 text-xs font-black text-background shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              초대하기
            </Button>
          </div>
        </form>
      )}

      {/* 2. 팀원 리스트 목록 구역 */}
      <div className="mt-5 space-y-3">
        <p className="text-xs font-black text-slate-700">
          참여 중인 팀원 목록 ({roomMembers.members.length}명)
        </p>

        <div className="divide-y divide-slate-100 rounded-xl border border-border bg-background overflow-hidden">
          {roomMembers.members.map(member => {
            const isTargetHost = member.is_host === true;
            const displayName =
              member.nickname?.trim() || member.github_username;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 border border-border">
                    {/* 🟢 [수정] null 형식을 방어하기 위해 ?? undefined 조건절 널 가드 장착 */}
                    <Avatar.Image
                      src={member.avatar_url ?? undefined}
                      alt={displayName}
                      className="object-cover"
                    />
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-black text-slate-700">
                        {displayName}
                      </span>
                      {isTargetHost && (
                        <span className="shrink-0 rounded-md bg-todak-coral-50 px-1.5 py-0.5 text-[9px] font-bold text-todak-coral-500 border border-todak-coral-100">
                          방장
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 truncate">
                      @{member.github_username}
                    </p>
                  </div>
                </div>

                {/* 제어 버튼 */}
                {canEdit && !isTargetHost && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleKickMember(
                        String(member.id),
                        member.github_username,
                      )
                    }
                    className="h-8 rounded-lg border border-red-100 bg-red-50/50 px-3 text-[11px] font-black text-danger hover:bg-red-100 hover:text-red-700 min-w-0"
                  >
                    추방
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 상태 메시지 배너 */}
      {errorMessage && (
        <p
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
          {successMessage}
        </p>
      )}
    </section>
  );
}
