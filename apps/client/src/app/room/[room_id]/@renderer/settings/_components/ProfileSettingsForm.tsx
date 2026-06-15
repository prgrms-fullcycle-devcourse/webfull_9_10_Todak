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
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
} from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';

interface ProfileSettingsFormProps {
  myRoomInfo?: RoomProfile;
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

export default function ProfileSettingsForm({
  myRoomInfo,
  roomID,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setMyChar = useSpaceStore(state => state.setMyChar);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState(() =>
    myRoomInfo ? getInitialAvatar(myRoomInfo.character_type) : avatars[0],
  );
  const [nickname, setNickname] = useState(
    myRoomInfo?.nickname?.trim() || myRoomInfo?.github_username || '',
  );
  const [selectedParts, setSelectedParts] = useState<Part[]>(() =>
    myRoomInfo ? getInitialParts(myRoomInfo.roles) : [parts[0]],
  );
  const [detailJob, setDetailJob] = useState(() =>
    myRoomInfo ? getInitialDetailJob(myRoomInfo) : detailJobs[parts[0]][0],
  );

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
    onSuccess: profile => {
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

      setProfileError(null);
      setSuccessMessage('프로필이 저장되었습니다.');
    },
    onError: error => {
      setSuccessMessage(null);

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
    setSuccessMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (updateProfileMutation.isPending || !myRoomInfo) {
      return;
    }

    if (nickname.trim() === '') {
      setProfileError('닉네임을 입력해주세요.');
      setSuccessMessage(null);
      return;
    }

    setProfileError(null);
    setSuccessMessage(null);
    updateProfileMutation.mutate();
  };

  if (!myRoomInfo) {
    return (
      <section
        className="scroll-mt-6 rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel"
        id="profile"
      >
        <p className="todak-section-label text-todak-coral-500">PROFILE</p>
        <h2 className="mt-2 text-lg font-black text-foreground">프로필</h2>
        <p className="mt-4 rounded-xl bg-background px-3.5 py-3 text-xs font-bold text-muted">
          아직 이 룸의 프로필 설정이 완료되지 않았습니다.
        </p>
      </section>
    );
  }

  return (
    <section
      className="scroll-mt-6 rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel"
      id="profile"
    >
      <p className="todak-section-label text-todak-coral-500">PROFILE</p>
      <h2 className="mt-2 text-lg font-black text-foreground">프로필</h2>

      <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
        <section>
          <p className="text-xs font-black text-slate-700">
            원하는 아바타 선택
          </p>
          <RadioGroup
            aria-label="원하는 아바타 선택"
            className="mt-3 grid grid-cols-5 place-items-center gap-2"
            isDisabled={updateProfileMutation.isPending}
            onChange={value => {
              const nextAvatar = avatars.find(avatar => avatar.id === value);

              if (nextAvatar) {
                setSelectedAvatar(nextAvatar);
                setSuccessMessage(null);
              }
            }}
            value={selectedAvatar.id}
          >
            {avatars.map(avatar => {
              const isSelected = selectedAvatar.id === avatar.id;

              return (
                <Radio
                  className={cn(
                    'todak-avatar aspect-square w-full max-w-[58px] cursor-pointer transition-all hover:-translate-y-0.5 hover:border-todak-coral-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-todak-coral-500 focus-visible:ring-offset-2',
                    isSelected &&
                      'todak-avatar-own border-todak-coral-500 bg-todak-coral-50 shadow-md',
                  )}
                  key={avatar.id}
                  value={avatar.id}
                >
                  <span className="sr-only">{avatar.name} 아바타 선택</span>
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
            htmlFor="settings-profile-nickname"
          >
            닉네임
          </label>
          <input
            className="todak-input h-9 rounded-xl px-3.5 py-0 text-xs font-semibold"
            disabled={updateProfileMutation.isPending}
            id="settings-profile-nickname"
            maxLength={20}
            onChange={event => {
              setNickname(event.target.value);
              setProfileError(null);
              setSuccessMessage(null);
            }}
            required
            value={nickname}
          />
        </section>

        <section>
          <p className="text-xs font-black text-slate-700">역할/파트</p>
          <CheckboxGroup
            aria-label="역할/파트"
            className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4"
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
            htmlFor="settings-profile-detail-job"
          >
            세부 직군
          </label>
          <div className="relative">
            <select
              className="todak-select h-9 appearance-none rounded-xl px-3.5 py-0 pr-10 text-xs font-semibold"
              disabled={updateProfileMutation.isPending}
              id="settings-profile-detail-job"
              onChange={event => {
                setDetailJob(event.target.value);
                setSuccessMessage(null);
              }}
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

        {successMessage !== null && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
            {successMessage}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            className="h-9 rounded-xl bg-foreground px-4 text-xs font-black text-background shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            isDisabled={updateProfileMutation.isPending}
            type="submit"
          >
            {updateProfileMutation.isPending ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </form>
    </section>
  );
}
