'use client';

import { useState } from 'react';
import { Modal, Input, Button, Chip } from '@heroui/react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  useSpaceStore,
  type AnimalType,
  type CharacterInfo,
} from '@/store/useSpaceStore';
import { useRoomUiStore } from '@/store/useRoomUiStore';
import { type RoomProfile } from '@/services/rooms/model';
import { fetchRoomMembers, updateRoomProfile } from '@/services/rooms/api';
import ModalTodoTabs from './ModalTodoTabs';
import {
  detailJobs,
  roleValueByPart,
} from '@/app/[user_id]/join/customize/_components/UserProfileForm';
import { useSocket } from '@/providers/SocketProvider';

const AVATAR_MAP = {
  rabbit: { label: '🐰 토끼', src: '/assets/rabbit_front.webp' },
  cat: { label: '🐱 고양이', src: '/assets/cat_front.webp' },
  dog: { label: '🐶 강아지', src: '/assets/dog_front.webp' },
  bear: { label: '🐻 곰', src: '/assets/bear_front.webp' },
  hamster: { label: '🐹 햄스터', src: '/assets/hamster_front.webp' },
} as const;

const STATUS_MAP: Record<string, string> = {
  focus: '🔥 집중',
  rest: '☕ 휴식',
  meeting: '💬 회의',
  away: '💤 부재',
};

const ROLE_OPTIONS = [
  { key: 'frontend', label: 'Frontend' },
  { key: 'backend', label: 'Backend' },
  { key: 'design', label: 'Design' },
  { key: 'pm', label: 'PM' },
];

const ROLE_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  design: 'Designer',
  pm: 'PM',
};

interface RoomMembersResponse {
  members: RoomProfile[];
  member_count: number;
}

function getUnifiedMember(
  selected: CharacterInfo | RoomProfile,
  serverMembers: RoomProfile[],
): RoomProfile {
  const targetId = String(selected.id);
  const targetGithub =
    'githubUsername' in selected
      ? selected.githubUsername
      : selected.github_username;

  const realMember = serverMembers.find(
    m => String(m.id) === targetId || m.github_username === targetGithub,
  );

  if (realMember) return realMember;

  if ('githubUsername' in selected) {
    return {
      id: selected.id,
      nickname: selected.name,
      github_username: selected.githubUsername,
      character_type: selected.avatarId,
      status: selected.status,
      roles: ['frontend'],
      detailed_role: 'Frontend Developer',
      avatar_url: '',
      is_host: false,
      pos_x: 0,
      pos_y: 0,
    };
  }
  return selected;
}

export default function CharacterDetailModal() {
  const { isCharacterModalOpen, selectedMember, closeCharacterModal } =
    useRoomUiStore();
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const { data: memberListData } = useQuery<RoomMembersResponse>({
    queryKey: ['room-members', roomID],
    queryFn: () => fetchRoomMembers(roomID),
  });

  if (!selectedMember) return null;

  const serverMembers = memberListData?.members ?? [];
  const unifiedMember = getUnifiedMember(selectedMember, serverMembers);

  return (
    <Modal isOpen={isCharacterModalOpen}>
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-none">
        <div className="absolute inset-0" onClick={closeCharacterModal} />

        <div className="relative bg-white rounded-[26px] border border-slate-100 shadow-xl max-w-115 w-full px-5 py-5 max-h-[95vh] overflow-y-auto pointer-events-auto mx-auto my-auto focus:outline-none z-10">
          <button
            onClick={closeCharacterModal}
            aria-label="모달 닫기"
            className="absolute top-5 right-6 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors z-50"
          >
            ✕
          </button>

          <ModalFormContent
            key={unifiedMember.id}
            member={unifiedMember}
            closeCharacterModal={closeCharacterModal}
          />
        </div>
      </div>
    </Modal>
  );
}

interface ModalFormContentProps {
  member: RoomProfile;
  closeCharacterModal: () => void;
}

function ModalFormContent({
  member,
  closeCharacterModal,
}: ModalFormContentProps) {
  const { myChar, setMyChar, members: storeMembers } = useSpaceStore();
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(member.nickname ?? '미지정');
  const [editAvatar, setEditAvatar] = useState<AnimalType>(
    (member.character_type ?? 'rabbit') as AnimalType,
  );
  const [editRole, setEditRole] = useState<string>(
    member.roles?.[0] ?? 'frontend',
  );
  const [editDetailedRole, setEditDetailedRole] = useState(
    member.detailed_role ?? 'Team Member',
  );

  const currentPartKey = Object.keys(roleValueByPart).find(
    key => roleValueByPart[key as keyof typeof roleValueByPart] === editRole,
  ) as keyof typeof detailJobs | undefined;

  const availableJobs = currentPartKey ? detailJobs[currentPartKey] : [];

  const isMe =
    String(member.id) === String(myChar.id) ||
    member.github_username === myChar.githubUsername;

  const liveMember = storeMembers.find(m => String(m.id) === String(member.id));
  const liveStatus = isMe
    ? myChar.status
    : (liveMember?.status ?? member.status);

  const mutation = useMutation({
    mutationFn: (body: {
      character_type: string;
      nickname: string;
      roles: string[];
      detailed_role: string | null;
    }) => updateRoomProfile(roomID, body),
    onSuccess: response => {
      const profile =
        response && 'data' in response
          ? (response as { data: RoomProfile }).data
          : (response as RoomProfile);

      queryClient.invalidateQueries({ queryKey: ['room-members', roomID] });

      router.refresh();

      setMyChar({
        name: profile.nickname ?? '미지정',
        avatarId: profile.character_type as AnimalType,
        roles: profile.roles ?? ['frontend'],
        detailedRole: profile.detailed_role ?? 'Team Member',
      });

      socket.emit('room:member-profile-changed', {
        userId: profile.id,
        nickname: profile.nickname,
        character_type: profile.character_type,
        roles: profile.roles,
        detailed_role: profile.detailed_role,
      });

      setIsEditing(false);
      closeCharacterModal();
    },
    onError: error => {
      console.error('❌ 프로필 수정 통신 에러:', error);
      alert('프로필 수정 중 오류가 발생했습니다.');
    },
  });

  const handleProfileSave = () => {
    if (!isMe) return;

    const profileUpdateBody = {
      character_type: editAvatar,
      nickname: editNickname.trim(),
      roles: [editRole],
      detailed_role:
        editDetailedRole.trim() === 'Team Member' ||
        editDetailedRole.trim() === ''
          ? null
          : editDetailedRole.trim(),
    };

    mutation.mutate(profileUpdateBody);
  };

  const handleOpenProfileSettings = () => {
    closeCharacterModal();
    router.push(`/room/${encodeURIComponent(roomID)}/settings#profile`);
  };

  return (
    <>
      <Modal.Header className="pt-3 pb-3 px-0">
        <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-1.5">
          🪪 {member.nickname}님의 상세 프로필
        </h3>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-6 px-0 max-w-110">
        <section className="overflow-hidden rounded-xl border border-border bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-4 py-3">
            <p className="text-[12px] font-bold text-foreground">
              Profile info
            </p>
            {isMe && !isEditing && (
              <Button
                className="h-8 rounded-lg border border-border bg-white px-3 text-[11px] font-bold text-muted hover:text-foreground"
                onPress={handleOpenProfileSettings}
                type="button"
              >
                ⚙️ 수정
              </Button>
            )}
          </header>
          <div className="flex items-start gap-4 px-4 py-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-secondary p-1">
              <Image
                src={AVATAR_MAP[editAvatar]?.src || '/assets/rabbit_front.webp'}
                alt={`${editNickname} 아바타`}
                width={80}
                height={80}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {!isEditing ? (
                <>
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="truncate text-[15px] font-black text-slate-800">
                      {member.nickname}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-bold text-muted">
                      {STATUS_MAP[liveStatus ?? ''] || liveStatus}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold tracking-tight text-muted">
                    GitHub:{' '}
                    <span className="font-mono text-slate-600">
                      @{member.github_username}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {(member.roles?.length ? member.roles : ['Role']).map(
                      role => (
                        <Chip
                          className="h-5 rounded-md bg-accent/10 px-1.5 font-todak-mono text-[8px] font-black text-accent"
                          key={role}
                          size="sm"
                          variant="soft"
                        >
                          {ROLE_LABELS[role] ?? role}
                        </Chip>
                      ),
                    )}
                  </div>
                  <p className="text-[11px] font-bold tracking-tight text-muted">
                    상세 역할:{' '}
                    <span className="font-extrabold text-slate-700">
                      {member.detailed_role}
                    </span>
                  </p>
                </>
              ) : (
                <div className="flex w-full flex-col gap-3.5 pt-1">
                  <div className="flex w-full flex-col gap-1">
                    <label className="text-[10px] font-black text-muted">
                      닉네임
                    </label>
                    <Input
                      variant="primary"
                      aria-label="닉네임"
                      value={editNickname}
                      onChange={e => setEditNickname(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-white text-xs font-bold focus-within:border-foreground"
                    />
                  </div>

                  <div className="flex w-full flex-col gap-1">
                    <label
                      className="text-[10px] font-black text-muted"
                      htmlFor="modal-avatar"
                    >
                      아바타
                    </label>
                    <div className="relative">
                      <select
                        id="modal-avatar"
                        className="h-10 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-0 pr-10 text-xs font-bold text-slate-800 focus:border-foreground focus:outline-none"
                        onChange={e =>
                          setEditAvatar(e.target.value as AnimalType)
                        }
                        value={editAvatar}
                      >
                        {Object.entries(AVATAR_MAP).map(([key, value]) => (
                          <option key={key} value={key}>
                            {value.label}
                          </option>
                        ))}
                      </select>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500"
                      >
                        ˅
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-1">
                    <label
                      className="text-[10px] font-black text-muted"
                      htmlFor="modal-role"
                    >
                      파트
                    </label>
                    <div className="relative">
                      <select
                        id="modal-role"
                        className="h-10 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-0 pr-10 text-xs font-bold text-slate-800 focus:border-foreground focus:outline-none"
                        onChange={e => {
                          const selectedKey = e.target.value;
                          setEditRole(selectedKey);
                          const mappedPartKey = Object.keys(
                            roleValueByPart,
                          ).find(
                            k =>
                              roleValueByPart[
                                k as keyof typeof roleValueByPart
                              ] === selectedKey,
                          ) as keyof typeof detailJobs | undefined;

                          const defaultJob = mappedPartKey
                            ? (detailJobs[mappedPartKey]?.[0] ?? '')
                            : '';
                          setEditDetailedRole(defaultJob);
                        }}
                        value={editRole}
                      >
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500"
                      >
                        ˅
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-1">
                    <label
                      className="text-[10px] font-black text-muted"
                      htmlFor="modal-detail-job"
                    >
                      세부 직군
                    </label>
                    <div className="relative">
                      <select
                        id="modal-detail-job"
                        className="h-10 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-0 pr-10 text-xs font-bold text-slate-800 focus:border-foreground focus:outline-none"
                        onChange={e => setEditDetailedRole(e.target.value)}
                        value={editDetailedRole}
                      >
                        {availableJobs.map(job => (
                          <option key={job} value={job}>
                            {job}
                          </option>
                        ))}
                      </select>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500"
                      >
                        ˅
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-4 flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                size="sm"
                className="h-8 rounded-lg border border-border bg-white px-3 text-[11px] font-bold text-foreground"
                onPress={() => setIsEditing(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                isDisabled={mutation.isPending}
                className="h-8 rounded-lg bg-foreground px-3 text-[11px] font-bold text-background disabled:opacity-50"
                onPress={handleProfileSave}
              >
                {mutation.isPending ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-white px-4 py-3">
          <ModalTodoTabs userId={member.id} isMe={isMe} />
        </section>

        <div className="flex flex-col items-center pt-0.5">
          <p className="text-[10px] font-semibold text-slate-400 tracking-tight">
            To-Do 목록은 깃허브 연동 이슈 사양에 맞춤 자동 매핑됩니다.
          </p>
        </div>
      </Modal.Body>
    </>
  );
}
