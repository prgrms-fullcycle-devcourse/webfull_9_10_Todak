'use client';

import { Checkbox, CheckboxGroup, Radio, RadioGroup } from '@heroui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ComponentProps, useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { isSystemError, isTodakApiError } from '@/sevice/error';
import {
  createRoomProfile,
  isRoomProfileAlreadySetUpError,
} from '@/sevice/rooms';

const avatars = [
  {
    id: 'bear',
    name: '곰',
    src: '/assets/bear_front.png',
  },
  {
    id: 'cat',
    name: '고양이',
    src: '/assets/cat_front.png',
  },
  {
    id: 'rabbit',
    name: '토끼',
    src: '/assets/rabbit_front.png',
  },
  {
    id: 'dog',
    name: '강아지',
    src: '/assets/dog_front.png',
  },
  {
    id: 'hamster',
    name: '햄스터',
    src: '/assets/hamster_front.png',
  },
] as const;

const parts = ['Frontend', 'Backend', 'Designer', 'PM'] as const;

const roleValueByPart: Record<(typeof parts)[number], string> = {
  Frontend: 'frontend',
  Backend: 'backend',
  Designer: 'design',
  PM: 'pm',
};

const detailJobs: Record<(typeof parts)[number], string[]> = {
  Frontend: ['Frontend Developer', 'UI Engineer', 'Web Performance Engineer'],
  Backend: ['Backend Developer', 'API Engineer', 'Database Engineer'],
  Designer: ['Product Designer', 'UX Designer', 'Design System Designer'],
  PM: ['Product Manager', 'Project Manager', 'Scrum Master'],
};

interface UserProfileFormProps {
  roomID: string;
  userID: string;
}

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>;

export default function UserProfileForm({
  roomID,
  userID,
}: UserProfileFormProps) {
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState<
    (typeof avatars)[number]
  >(avatars[0]);
  const [nickname, setNickname] = useState('수정');
  const [selectedParts, setSelectedParts] = useState<(typeof parts)[number][]>([
    'Frontend',
  ]);
  const [detailJob, setDetailJob] = useState(detailJobs.Frontend[0]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableDetailJobs = useMemo(() => {
    return selectedParts.flatMap(part => detailJobs[part]);
  }, [selectedParts]);

  const selectedDetailJob = availableDetailJobs.includes(detailJob)
    ? detailJob
    : availableDetailJobs[0];

  const roomHref = `/room/${encodeURIComponent(roomID)}`;

  const handleProfileSubmit: FormSubmitHandler = async event => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedNickname = nickname.trim();

    if (roomID === '') {
      setProfileError(
        '입장할 룸 정보가 없습니다. 초대 또는 생성 단계부터 다시 진행해주세요.',
      );
      return;
    }

    if (trimmedNickname === '') {
      setProfileError('닉네임을 입력해주세요.');
      return;
    }

    setProfileError(null);
    setIsSubmitting(true);

    try {
      await createRoomProfile({
        roomID,
        character_type: selectedAvatar.id,
        nickname: trimmedNickname,
        roles: selectedParts.map(part => roleValueByPart[part]),
        detailed_role: selectedDetailJob,
      });

      router.push(roomHref);
    } catch (error) {
      if (isRoomProfileAlreadySetUpError(error)) {
        router.replace(roomHref);
        return;
      }

      if (isTodakApiError(error)) {
        setProfileError(error.response.data.error);
        return;
      }

      if (isSystemError(error)) {
        setProfileError(error.message);
        return;
      }

      setProfileError('프로필 설정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-dvh w-full items-start justify-center bg-background px-5 pb-6 pt-[max(1.5rem,calc((100dvh-548px)/2))]">
      <form
        className="todak-card w-full max-w-[520px] gap-0 rounded-[26px] border border-border/80 bg-surface px-7 py-8 shadow-todak-panel"
        noValidate
        onSubmit={handleProfileSubmit}
      >
        <header className="text-center">
          <p className="todak-section-label text-todak-coral-500">
            USER PROFILE
          </p>
          <h1 className="todak-title text-[21px] leading-tight sm:text-[23px]">
            나의 캐릭터 & 역할 지정
          </h1>
          <p className="todak-subcopy text-[10px] font-bold sm:text-[11px]">
            2D 가상 공간에서 표시될 캐릭터 디자인과 직군 정보를 맞춤 정의합니다.
          </p>
        </header>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-black text-slate-700">
              원하는 아바타 선택
            </p>
            <RadioGroup
              aria-label="원하는 아바타 선택"
              className="mt-3 grid grid-cols-5 place-items-center gap-2 sm:gap-3"
              onChange={value => {
                const nextAvatar = avatars.find(avatar => avatar.id === value);

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
                      priority={avatar.id === 'bear'}
                      src={avatar.src}
                      width={420}
                    />
                  </Radio>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-black text-slate-700"
              htmlFor="profile-nickname"
            >
              닉네임
            </label>
            <input
              className="todak-input h-9 rounded-xl px-3.5 py-0 text-xs font-semibold"
              disabled={isSubmitting}
              id="profile-nickname"
              maxLength={20}
              onChange={event => {
                setNickname(event.target.value);
                setProfileError(null);
              }}
              required
              value={nickname}
            />
          </div>

          <div>
            <p className="text-xs font-black text-slate-700">
              역할/파트 (중복 선택 가능)
            </p>
            <CheckboxGroup
              aria-label="역할/파트"
              className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2"
              onChange={value => {
                const nextParts = value.filter(part =>
                  parts.includes(part as (typeof parts)[number]),
                ) as (typeof parts)[number][];

                if (nextParts.length > 0) {
                  setSelectedParts(nextParts);
                }
              }}
              value={selectedParts}
            >
              {parts.map(part => {
                const isSelected = selectedParts.includes(part);

                return (
                  <Checkbox
                    className={cn(
                      'flex h-9 cursor-pointer items-center justify-center gap-0 rounded-xl border border-border bg-surface px-1 text-center text-[11px] font-black text-slate-500 shadow-sm transition-all hover:border-todak-coral-200 hover:bg-todak-coral-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-todak-coral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-2 sm:text-xs',
                      isSelected &&
                        'border-todak-coral-500 bg-todak-coral-50 text-todak-coral-500 shadow-sm',
                    )}
                    isDisabled={isSubmitting}
                    key={part}
                    value={part}
                  >
                    {part}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-black text-slate-700"
              htmlFor="detail-job"
            >
              세부 직군 설정
            </label>
            <div className="relative">
              <select
                className="todak-select h-9 appearance-none rounded-xl px-3.5 py-0 pr-10 text-xs font-semibold"
                disabled={isSubmitting}
                id="detail-job"
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
          </div>

          {profileError !== null && (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
              role="alert"
            >
              {profileError}
            </p>
          )}

          <button
            className="todak-button-dark h-9 w-full rounded-xl text-xs disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <span aria-hidden="true">🚀</span>
            {isSubmitting ? '프로필 저장 중...' : '토닥윗미 가상 타운 입장하기'}
          </button>
        </div>

        <p className="sr-only">
          {userID} 사용자가 {selectedAvatar.name} 캐릭터와{' '}
          {selectedParts.join(', ')} 역할로 {selectedDetailJob} 세부 직군을
          선택했습니다.
        </p>
      </form>
    </section>
  );
}
