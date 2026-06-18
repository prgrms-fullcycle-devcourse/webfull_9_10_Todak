'use client';

import RouteFallbackView from '@/app/_components/RouteFallbackView';
import type { RoomMembers, RoomProfile } from '@/services/rooms/model';
import {
  cancelInvitation,
  fetchCollaborators,
  fetchInvitations,
  inviteCollaborator,
  removeCollaborator,
} from '@/services/teams/api';
import { Button, Avatar } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

interface TeamSettingsFormProps {
  myRoomInfo?: RoomProfile;
  roomMembers: RoomMembers;
  roomID: string;
}

export default function TeamSettingsForm({
  myRoomInfo,
  roomID,
}: TeamSettingsFormProps) {
  const queryClient = useQueryClient();
  const [searchUsername, setSearchUsername] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canEdit = myRoomInfo?.is_host === true;

  // 수락 완료된 정식 협업자 목록 실시간 조회
  const collaboratorsQuery = useQuery({
    queryKey: ['room-collaborators', roomID],
    queryFn: () => fetchCollaborators(roomID),
    retry: false,
  });

  const error = collaboratorsQuery.error;
  const isKicked = axios.isAxiosError(error) && error.response?.status === 403;

  // 보류 중인 깃허브 초대 대기자 목록 실시간 조회
  const invitationsQuery = useQuery({
    queryKey: ['room-invitations', roomID],
    queryFn: () => fetchInvitations(roomID),
    enabled: canEdit,
    retry: false,
  });

  // 협업자 초대 가동 Mutation
  const inviteMutation = useMutation({
    mutationFn: (username: string) => inviteCollaborator(roomID, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-invitations', roomID] });
      setErrorMessage(null);
      setSuccessMessage(
        `@${searchUsername} 님에게 GitHub 레포지토리 초대장을 발송했습니다!`,
      );
      setSearchUsername('');
    },
    onError: () => {
      setSuccessMessage(null);
      setErrorMessage('GitHub 유저를 찾을 수 없거나 초대 권한이 없습니다.');
    },
  });

  // 보류 중인 초대 취소 Mutation
  const cancelInviteMutation = useMutation({
    mutationFn: (invitationId: number) =>
      cancelInvitation(roomID, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-invitations', roomID] });
      setSuccessMessage('초대가 성공적으로 취소되었습니다.');
    },
  });

  // 기존 멤버 제거 Mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: (username: string) => removeCollaborator(roomID, username),
    onSuccess: (_, username) => {
      queryClient.invalidateQueries({
        queryKey: ['room-collaborators', roomID],
      });
      setSuccessMessage(
        `@${username} 님이 깃허브 레포지토리에서 완전히 추방되었습니다.`,
      );
    },
    onError: () => {
      setErrorMessage('협업자 추방에 실패했습니다.');
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = searchUsername.trim();
    if (!canEdit || !targetName) return;
    inviteMutation.mutate(targetName);
  };

  // // 추방 가드 레이어 고도화
  // if (collaboratorsQuery.isError) {
  //   const error = collaboratorsQuery.error;
  //   const isKicked =
  //     axios.isAxiosError(error) && error.response?.status === 403;

  //   return (
  //     <RouteFallbackView
  //       variant="segment"
  //       eyebrow={isKicked ? 'ACCESS DENIED' : 'TEAM COMPONENT ERROR'}
  //       title={isKicked ? '룸 권한을 상실했습니다.' : '팀 목록 로드 실패'}
  //       description={
  //         isKicked
  //           ? '이 프로젝트 룸의 멤버 명단에서 제외되었거나 추방 처리되었습니다.'
  //           : '협업자 명단을 백엔드로부터 불러오지 못했습니다.'
  //       }
  //       onRetry={() => collaboratorsQuery.refetch()}
  //     />
  //   );
  // }

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

          <div className="mt-3 flex gap-3">
            <input
              type="text"
              placeholder="GitHub 유저네임 입력"
              className="todak-input h-9 flex-1 rounded-xl px-3.5 py-0 text-xs font-semibold"
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              disabled={inviteMutation.isPending}
            />
            <Button
              type="submit"
              isDisabled={!searchUsername.trim() || inviteMutation.isPending}
              className="h-9 rounded-xl bg-foreground px-4 text-xs font-black text-background shadow-sm hover:bg-slate-800"
            >
              {inviteMutation.isPending ? '초대 중...' : '초대하기'}
            </Button>
          </div>
        </form>
      )}

      {/* 현재 수락 완료된 팀원 목록 */}
      <div className="mt-5 space-y-3">
        <p className="text-xs font-black text-slate-700">
          참여 중인 팀원 목록 ({collaboratorsQuery.data?.length ?? 0}명)
        </p>
        <div className="divide-y divide-slate-100 rounded-xl border border-border bg-background overflow-hidden">
          {collaboratorsQuery.data?.map(member => (
            <div
              key={member.login}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 border border-border">
                  <Avatar.Image
                    src={member.avatarUrl}
                    alt={member.login}
                    className="object-cover"
                  />
                </Avatar>
                <div className="min-w-0">
                  <span className="truncate text-xs font-black text-slate-700">
                    @{member.login}
                  </span>
                  <p className="text-[10px] font-medium text-slate-400 capitalize">
                    권한 레벨: {member.permission}
                  </p>
                </div>
              </div>

              {/* 방장(Admin) 레벨이 아닌 팀원만 추방 가능 가드 */}
              {canEdit && member.permission !== 'admin' && (
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={removeCollaboratorMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `정말 @${member.login} 팀원을 추방하시겠습니까?`,
                      )
                    ) {
                      removeCollaboratorMutation.mutate(member.login);
                    }
                  }}
                  className="h-8 rounded-lg border border-red-100 bg-red-50/50 px-3 text-[11px] font-black text-danger hover:bg-red-100"
                >
                  추방
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 보류 중인 초대 대기 목록 섹션 */}
      {canEdit && (invitationsQuery.data?.length ?? 0) > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-black text-slate-400 flex items-center gap-1.5">
            ⏳ 수락 대기 중인 초대 ({invitationsQuery.data?.length ?? 0}명)
          </p>
          <div className="divide-y divide-slate-100 rounded-xl border border-dashed border-border bg-slate-50/30 overflow-hidden">
            {invitationsQuery.data?.map(invite => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3.5"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-600">
                    @{invite.login}
                  </span>
                  <p className="text-[9px] text-slate-400 font-medium">
                    초대 일시: {new Date(invite.invitedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm('초대 발송을 취소하시겠습니까?')) {
                      cancelInviteMutation.mutate(invite.id);
                    }
                  }}
                  className="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 min-w-0"
                >
                  초대 취소
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 알림 배너 */}
      {(errorMessage || inviteMutation.isError) && (
        <p
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
          role="alert"
        >
          {errorMessage || 'API 통신 오류가 발생했습니다.'}
        </p>
      )}
      {successMessage && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
          {successMessage}
        </p>
      )}

      {/* 추방 안내 모달
      {isKicked && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md scale-100 rounded-2xl border border-border bg-surface/90 p-6 shadow-2xl backdrop-blur-md text-center animate-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-todak-coral-50 text-xl mx-auto">
              🚨
            </div>
            <p className="todak-section-label text-todak-coral-500 font-black mt-4">
              ACCESS DENIED
            </p>
            <h3 className="mt-2 text-base font-black text-foreground">
              룸 권한이 제거됐습니다.
            </h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
              이 프로젝트 룸의 GitHub 협업자 명단에서 제외되었거나
              추방되었습니다.
              <br />
              <span className="font-bold text-foreground">안전한 이용</span>을
              위해 메인 화면으로 이동합니다.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                className="h-9 rounded-xl bg-foreground px-5 text-xs font-black text-background shadow-sm hover:bg-slate-800"
                onPress={() => window.location.assign('/')}
              >
                확인 및 홈으로 이동 🚀
              </Button>
            </div>
          </div>
        </div>
      )} */}
    </section>
  );
}
