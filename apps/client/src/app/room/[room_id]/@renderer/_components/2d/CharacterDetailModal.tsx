'use client';

import { useState } from 'react';
import { Modal, Input, Button } from '@heroui/react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  useSpaceStore,
  type AnimalType,
  type CharacterInfo,
} from '@/store/useSpaceStore';
import { type RoomProfile } from '@/services/rooms/model';
import { fetchRoomMembers, updateRoomProfile } from '@/services/rooms/api';
import ModalTodoTabs from './ModalTodoTabs';
import {
  detailJobs,
  roleValueByPart,
} from '@/app/[user_id]/join/customize/_components/UserProfileForm';
import { getSocket } from '@/lib/socket';

const AVATAR_MAP = {
  rabbit: { label: '🐰 토끼', src: '/assets/rabbit_front.png' },
  cat: { label: '🐱 고양이', src: '/assets/cat_front.png' },
  dog: { label: '🐶 강아지', src: '/assets/dog_front.png' },
  bear: { label: '🐻 곰', src: '/assets/bear_front.png' },
  hamster: { label: '🐹 햄스터', src: '/assets/hamster_front.png' },
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
    useSpaceStore();
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const { data: memberListData } = useQuery<RoomMembersResponse>({
    queryKey: ['room-members', roomID],
    queryFn: () => fetchRoomMembers(roomID),
  });

  if (!selectedMember) return null;

  const serverMembers = memberListData?.members ?? [];
  const unifiedMember = getUnifiedMember(selectedMember, serverMembers);

  return (
    <Modal isOpen={isCharacterModalOpen} onOpenChange={closeCharacterModal}>
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
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

      getSocket().emit('room:member-profile-changed', {
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

  return (
    <>
      <Modal.Header className="pt-3 pb-3 px-0">
        <h3 className="text-[16px] font-black text-slate-800 flex items-center gap-1.5">
          🪪 {member.nickname}님의 상세 프로필
        </h3>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-6 px-0 max-w-110">
        <div className="relative rounded-[22px] border border-slate-100 bg-slate-50/60 p-5 shadow-sm">
          {isMe && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-5 text-[11px] font-extrabold text-slate-400 hover:text-slate-800 transition-colors bg-white px-2 py-1 rounded-md border border-slate-200/60 shadow-sm"
            >
              ⚙️ 수정
            </button>
          )}

          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-1">
              <Image
                src={AVATAR_MAP[editAvatar]?.src || '/assets/rabbit_front.png'}
                alt={`${editNickname} 아바타`}
                width={80}
                height={80}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[15px] font-black text-slate-800 truncate">
                      {member.nickname}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-600 shrink-0">
                      {STATUS_MAP[liveStatus ?? ''] || liveStatus}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-tight">
                    GitHub:{' '}
                    <span className="font-mono text-slate-600">
                      @{member.github_username}
                    </span>
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 tracking-tight">
                    파트:{' '}
                    <span className="text-indigo-600 font-extrabold">
                      {(member.roles ?? []).join(', ').toUpperCase()}
                    </span>
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 tracking-tight">
                    상세 역할:{' '}
                    <span className="text-slate-700 font-extrabold">
                      {member.detailed_role}
                    </span>
                  </p>
                </>
              ) : (
                <div className="flex flex-col gap-3.5 w-full pt-1">
                  <div className="w-full flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400">
                      닉네임
                    </label>
                    <Input
                      variant="primary"
                      aria-label="닉네임"
                      value={editNickname}
                      onChange={e => setEditNickname(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl h-10 text-xs font-bold focus-within:border-slate-800"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-1">
                    <label
                      className="text-[10px] font-black text-slate-400"
                      htmlFor="modal-avatar"
                    >
                      아바타
                    </label>
                    <div className="relative">
                      <select
                        id="modal-avatar"
                        className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-0 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-800"
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

                  <div className="w-full flex flex-col gap-1">
                    <label
                      className="text-[10px] font-black text-slate-400"
                      htmlFor="modal-role"
                    >
                      파트
                    </label>
                    <div className="relative">
                      <select
                        id="modal-role"
                        className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-0 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-800"
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

                  <div className="w-full flex flex-col gap-1">
                    <label
                      className="text-[10px] font-black text-slate-400"
                      htmlFor="modal-detail-job"
                    >
                      세부 직군
                    </label>
                    <div className="relative">
                      <select
                        id="modal-detail-job"
                        className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-0 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-800"
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
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button
                size="sm"
                className="bg-slate-100 text-slate-500 font-bold text-[11px] rounded-lg px-3 h-7"
                onPress={() => setIsEditing(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                isDisabled={mutation.isPending}
                className="bg-slate-900 text-white font-black text-[11px] rounded-lg px-3 h-7 shadow-sm hover:bg-slate-800 disabled:opacity-50"
                onPress={handleProfileSave}
              >
                {mutation.isPending ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          )}
        </div>

        <div className="w-full">
          <ModalTodoTabs userId={member.id} isMe={isMe} />
        </div>

        <div className="flex flex-col items-center pt-0.5">
          <p className="text-[10px] font-semibold text-slate-400 tracking-tight">
            To-Do 목록은 깃허브 연동 이슈 사양에 맞춤 자동 매핑됩니다.
          </p>
        </div>
      </Modal.Body>
    </>
  );
}
