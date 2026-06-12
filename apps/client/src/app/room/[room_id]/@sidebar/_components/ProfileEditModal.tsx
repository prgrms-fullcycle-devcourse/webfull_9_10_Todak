'use client';

import {
  avatars,
  detailJobs,
  parts,
  roleValueByPart,
} from '@/app/[user_id]/join/customize/_components/UserProfileForm';
import { cn } from '@/lib/cn';
import { getSocket } from '@/lib/socket';
import { isSystemError, isTodakApiError } from '@/services/error';
import { updateRoomProfile } from '@/services/rooms/api';
import type { RoomProfile } from '@/services/rooms/model';
import { useSpaceStore, type AnimalType } from '@/store/useSpaceStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Modal,
  Radio,
  RadioGroup,
} from '@heroui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';

interface ProfileEditModalProps {
  isOpen: boolean;
  myRoomInfo: RoomProfile;
  onOpenChange: (isOpen: boolean) => void;
  roomID: string;
}

type Part = (typeof parts)[number];

function getInitialParts(roles: string[]) {
  const selectedParts = roles
    .map(role => parts.find(part => roleValueByPart[part] === role))
    .filter((part): part is Part => part !== undefined);

  return selectedParts.length > 0 ? selectedParts : [parts[0]];
}

function getInitialAvatar(characterType: string | null) {
  return avatars.find(avatar => avatar.id === characterType) ?? avatars[0];
}

function getInitialDetailJob(profile: RoomProfile) {
  if (profile.detailed_role) {
    return profile.detailed_role;
  }

  const initialParts = getInitialParts(profile.roles);

  return detailJobs[initialParts[0]][0];
}

export default function ProfileEditModal({
  isOpen,
  myRoomInfo,
  onOpenChange,
  roomID,
}: ProfileEditModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setMyChar = useSpaceStore(state => state.setMyChar);

  const [selectedAvatar, setSelectedAvatar] = useState(() =>
    getInitialAvatar(myRoomInfo.character_type),
  );
  const [nickname, setNickname] = useState(
    myRoomInfo.nickname?.trim() || myRoomInfo.github_username,
  );
  const [selectedParts, setSelectedParts] = useState<Part[]>(() =>
    getInitialParts(myRoomInfo.roles),
  );
  const [detailJob, setDetailJob] = useState(() =>
    getInitialDetailJob(myRoomInfo),
  );
  const [profileError, setProfileError] = useState<string | null>(null);

  const availableDetailJobs = useMemo(() => {
    return selectedParts.flatMap(part => detailJobs[part]);
  }, [selectedParts]);

  const selectedDetailJob = availableDetailJobs.includes(detailJob)
    ? detailJob
    : (availableDetailJobs[0] ?? '');

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      updateRoomProfile(roomID, {
        character_type: selectedAvatar.id,
        nickname: nickname.trim(),
        roles: selectedParts.map(part => roleValueByPart[part]),
        detailed_role: selectedDetailJob.trim() || null,
      }),
    onSuccess: response => {
      const profile = response.data;

      queryClient.invalidateQueries({ queryKey: ['room-members', roomID] });
      router.refresh();

      setMyChar({
        name: profile.nickname ?? profile.github_username,
        avatarId: (profile.character_type ?? 'rabbit') as AnimalType,
        roles: profile.roles ?? [],
        detailedRole: profile.detailed_role ?? 'Team Member',
      });

      getSocket().emit('room:member-profile-changed', {
        userId: profile.id,
        nickname: profile.nickname,
        character_type: profile.character_type,
        roles: profile.roles,
        detailed_role: profile.detailed_role,
      });

      onOpenChange(false);
    },
    onError: error => {
      if (isTodakApiError(error)) {
        setProfileError(error.response.data.error);
        return;
      }

      if (isSystemError(error)) {
        setProfileError(error.message);
        return;
      }

      setProfileError('프로필 수정에 실패했습니다.');
    },
  });

  const handlePartChange = (value: string[]) => {
    const nextParts = value.filter(part =>
      parts.includes(part as Part),
    ) as Part[];

    if (nextParts.length === 0) {
      return;
    }

    const nextJobs = nextParts.flatMap(part => detailJobs[part]);

    setSelectedParts(nextParts);
    setDetailJob(currentJob =>
      nextJobs.includes(currentJob) ? currentJob : (nextJobs[0] ?? ''),
    );
    setProfileError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (updateProfileMutation.isPending) {
      return;
    }

    if (nickname.trim() === '') {
      setProfileError('닉네임을 입력해주세요.');
      return;
    }

    setProfileError(null);
    updateProfileMutation.mutate();
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="w-full max-w-[520px] rounded-[26px] border border-border/80 bg-surface px-5 py-5 shadow-todak-panel">
          <form noValidate onSubmit={handleSubmit}>
            <Modal.Header className="flex items-start justify-between gap-4 px-0 pb-4 pt-0">
              <div className="min-w-0">
                <p className="todak-section-label text-todak-coral-500">
                  USER PROFILE
                </p>
                <Modal.Heading className="text-[18px] font-black leading-tight text-foreground">
                  프로필 수정
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="max-h-[70vh] space-y-4 overflow-y-auto px-0">
              <section>
                <p className="text-xs font-black text-slate-700">
                  원하는 아바타 선택
                </p>
                <RadioGroup
                  aria-label="원하는 아바타 선택"
                  className="mt-3 grid grid-cols-5 place-items-center gap-2"
                  isDisabled={updateProfileMutation.isPending}
                  onChange={value => {
                    const nextAvatar = avatars.find(
                      avatar => avatar.id === value,
                    );

                    if (nextAvatar) {
                      setSelectedAvatar(nextAvatar);
                    }
                  }}
                  value={selectedAvatar.id}
                >
                  {avatars.map(avatar => {
                    const isSelected = selectedAvatar.id === avatar.id;

                    return (
                      <Radio
                        className={cn(
                          'todak-avatar aspect-square w-full max-w-[52px] cursor-pointer transition-all hover:-translate-y-0.5 hover:border-todak-coral-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-todak-coral-500 focus-visible:ring-offset-2',
                          isSelected &&
                            'todak-avatar-own border-todak-coral-500 bg-todak-coral-50 shadow-md',
                        )}
                        key={avatar.id}
                        value={avatar.id}
                      >
                        <span className="sr-only">
                          {avatar.name} 아바타 선택
                        </span>
                        <Image
                          alt=""
                          className="h-[72%] w-[72%] object-contain"
                          height={550}
                          src={avatar.src}
                          width={420}
                        />
                      </Radio>
                    );
                  })}
                </RadioGroup>
              </section>

              <section className="space-y-2">
                <label
                  className="block text-xs font-black text-slate-700"
                  htmlFor="profile-edit-nickname"
                >
                  닉네임
                </label>
                <input
                  className="todak-input h-9 rounded-xl px-3.5 py-0 text-xs font-semibold"
                  disabled={updateProfileMutation.isPending}
                  id="profile-edit-nickname"
                  maxLength={20}
                  onChange={event => {
                    setNickname(event.target.value);
                    setProfileError(null);
                  }}
                  required
                  value={nickname}
                />
              </section>

              <section>
                <p className="text-xs font-black text-slate-700">역할/파트</p>
                <CheckboxGroup
                  aria-label="역할/파트"
                  className="mt-3 grid grid-cols-4 gap-1.5"
                  isDisabled={updateProfileMutation.isPending}
                  onChange={handlePartChange}
                  value={selectedParts}
                >
                  {parts.map(part => {
                    const isSelected = selectedParts.includes(part);

                    return (
                      <Checkbox
                        className={cn(
                          'flex h-9 cursor-pointer items-center justify-center gap-0 rounded-xl border border-border bg-surface px-1 text-center text-[11px] font-black text-slate-500 shadow-sm transition-all hover:border-todak-coral-200 hover:bg-todak-coral-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-todak-coral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                          isSelected &&
                            'border-todak-coral-500 bg-todak-coral-50 text-todak-coral-500 shadow-sm',
                        )}
                        key={part}
                        value={part}
                      >
                        {part}
                      </Checkbox>
                    );
                  })}
                </CheckboxGroup>
              </section>

              <section className="space-y-2">
                <label
                  className="block text-xs font-black text-slate-700"
                  htmlFor="profile-edit-detail-job"
                >
                  세부 직군
                </label>
                <div className="relative">
                  <select
                    className="todak-select h-9 appearance-none rounded-xl px-3.5 py-0 pr-10 text-xs font-semibold"
                    disabled={updateProfileMutation.isPending}
                    id="profile-edit-detail-job"
                    onChange={event => setDetailJob(event.target.value)}
                    value={selectedDetailJob}
                  >
                    {availableDetailJobs.map(job => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-600"
                  >
                    ˅
                  </span>
                </div>
              </section>

              {profileError !== null && (
                <p
                  className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
                  role="alert"
                >
                  {profileError}
                </p>
              )}
            </Modal.Body>

            <Modal.Footer className="mt-5 flex justify-end gap-2 border-t border-border px-0 pb-0 pt-4">
              <Button
                className="h-9 rounded-xl bg-surface-secondary px-4 text-xs font-black text-muted"
                isDisabled={updateProfileMutation.isPending}
                onPress={() => onOpenChange(false)}
                type="button"
                variant="ghost"
              >
                취소
              </Button>
              <Button
                className="h-9 rounded-xl bg-foreground px-4 text-xs font-black text-background shadow-sm hover:bg-slate-800 disabled:opacity-60"
                isDisabled={updateProfileMutation.isPending}
                type="submit"
              >
                {updateProfileMutation.isPending ? '저장 중...' : '저장하기'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
