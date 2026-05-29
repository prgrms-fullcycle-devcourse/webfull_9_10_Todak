'use client';

import { isSystemError, isTodakApiError } from '@/sevice/error';
import { createRepository } from '@/sevice/repos';
import { createRooms, fetchMyRooms } from '@/sevice/rooms';
import { Card, Chip, Input, NumberField, Tabs } from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState } from 'react';

const TabOptions = [
  {
    id: 'create',
    label: '새 프로젝트 생성',
    icon: '+',
  },
  {
    id: 'invite',
    label: '초대 코드로 참여',
    icon: '🔑',
  },
];

interface ProjectHubProps {
  userID: string;
}

function FieldLabel({
  children,
  htmlFor,
  required = false,
}: {
  children: ReactNode;
  htmlFor: string;
  required?: boolean;
}) {
  return (
    <label
      className="flex items-center gap-1 text-xs font-black text-slate-700"
      htmlFor={htmlFor}
    >
      <span>{children}</span>
      {required && (
        <span aria-hidden="true" className="text-todak-coral-500">
          *
        </span>
      )}
      {required && <span className="sr-only">필수</span>}
    </label>
  );
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
}

function getValidMaxMembers(value: number) {
  if (!Number.isFinite(value)) {
    return 4;
  }

  return Math.min(Math.max(Math.trunc(value), 2), 20);
}

export default function ProjectHub({ userID }: ProjectHubProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [maxMembers, setMaxMembers] = useState(4);

  const { data: myRooms } = useQuery({
    queryKey: ['myRooms'],
    queryFn: fetchMyRooms,
  });
  const customizeHref = (roomID: string) =>
    `/${encodeURIComponent(userID)}/join/customize?roomID=${encodeURIComponent(roomID)}`;

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreating) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const roomName = getFormString(formData, 'roomName');
    const repositoryName = getFormString(formData, 'repositoryName');

    if (roomName === '' || repositoryName === '') {
      setCreateError('프로젝트 룸 이름과 레포지토리 이름을 입력해주세요.');
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      const repository = await createRepository({ name: repositoryName });
      const room = await createRooms({
        name: roomName,
        repo_full_name: repository.full_name,
        max_members: getValidMaxMembers(maxMembers),
      });

      await queryClient.invalidateQueries({ queryKey: ['myRooms'] });
      router.push(customizeHref(room.id));
    } catch (error) {
      if (isTodakApiError(error)) {
        setCreateError(error.response.data.error);
        return;
      }

      if (isSystemError(error)) {
        setCreateError(error.message);
        return;
      }

      setCreateError('프로젝트 룸 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="flex min-h-dvh w-full items-start justify-center bg-background px-5 pb-8 pt-[max(2rem,calc((100dvh-494px)/2))]">
      <Card className="w-full max-w-[386px] gap-0 rounded-[26px] border border-border/80 bg-surface px-7 py-8 shadow-todak-panel">
        <Card.Header className="items-center gap-2 text-center">
          <p className="todak-section-label text-todak-coral-500">
            PROJECT HUB
          </p>
          <Card.Title className="todak-title text-[21px] leading-tight sm:text-[23px]">
            협업할 프로젝트 팀 연결
          </Card.Title>
          <Card.Description className="todak-subcopy text-[10px] font-bold sm:text-[11px]">
            새로운 스터디룸을 생성하거나 초대 코드를 통해 기존 룸에 진입합니다
          </Card.Description>
        </Card.Header>
        <Card.Content className="mt-5 gap-0">
          <Tabs defaultSelectedKey="create" className="gap-0">
            <Tabs.ListContainer className="mb-5">
              <Tabs.List className="w-full overflow-hidden rounded-xl border border-border bg-background p-0 shadow-sm">
                {TabOptions.map(option => (
                  <Tabs.Tab
                    className="h-9 rounded-none px-2 text-[11px] font-black text-slate-500 transition-colors first:rounded-l-[11px] last:rounded-r-[11px] data-[selected=true]:bg-slate-900 data-[selected=true]:text-white"
                    key={`team-selection-tabs-${option.id}`}
                    id={option.id}
                  >
                    <span className="flex min-w-0 items-center justify-center gap-1.5">
                      <span aria-hidden="true">{option.icon}</span>
                      <span className="truncate">{option.label}</span>
                    </span>
                    <Tabs.Indicator className="hidden" />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
            {TabOptions.map(option => (
              <Tabs.Panel
                className="mt-0 p-0 outline-none"
                key={`team-selection-tabs-panel-${option.id}`}
                id={option.id}
              >
                {option.id === 'create' ? (
                  <form className="space-y-4" onSubmit={handleCreateProject}>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="project-room-name" required>
                        프로젝트 룸 이름
                      </FieldLabel>
                      <Input
                        aria-label="프로젝트 룸 이름"
                        className="h-9 rounded-xl border border-border bg-surface px-3.5 py-0 text-xs font-semibold text-slate-700 shadow-field placeholder:text-slate-400 focus:border-accent"
                        disabled={isCreating}
                        fullWidth
                        id="project-room-name"
                        maxLength={100}
                        name="roomName"
                        placeholder="프로젝트 룸 이름을 입력하세요"
                        required
                      />
                      <FieldLabel htmlFor="github-repository-name" required>
                        GitHub 레포지토리 이름
                      </FieldLabel>
                      <Input
                        aria-label="GitHub 레포지토리 이름"
                        className="h-9 rounded-xl border border-border bg-surface px-3.5 py-0 text-xs font-semibold text-slate-700 shadow-field placeholder:text-slate-400 focus:border-accent"
                        disabled={isCreating}
                        fullWidth
                        id="github-repository-name"
                        maxLength={100}
                        name="repositoryName"
                        pattern="[A-Za-z0-9_.\-]+"
                        placeholder="레포지토리 이름을 입력하세요"
                        required
                        title="영문, 숫자, -, _, . 만 사용할 수 있습니다."
                      />
                      <FieldLabel htmlFor="project-max-members">
                        최대 인원
                      </FieldLabel>
                      <NumberField
                        aria-label="최대 인원"
                        isDisabled={isCreating}
                        maxValue={20}
                        minValue={2}
                        onChange={value =>
                          setMaxMembers(Number.isFinite(value) ? value : 4)
                        }
                        value={maxMembers}
                      >
                        <NumberField.Group>
                          <NumberField.DecrementButton type="button" />
                          <NumberField.Input id="project-max-members" />
                          <NumberField.IncrementButton type="button" />
                        </NumberField.Group>
                      </NumberField>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-slate-400">
                        연결 가능한 기존 팀 리스트
                      </p>
                      {!myRooms ||
                        (myRooms.length === 0 && (
                          <div className="space-y-2">
                            참여 중인 프로젝트가 없습니다.
                          </div>
                        ))}
                      {myRooms && (
                        <div className="space-y-2">
                          {myRooms.map(room => (
                            <Link
                              className="group flex min-h-[50px] items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-sm transition-colors hover:border-todak-coral-200 hover:bg-todak-coral-50/60"
                              key={`existing-team-list-${room.id}`}
                              href={customizeHref(room.id)}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-black text-slate-800">
                                  {room.name}
                                </span>
                                <span className="todak-mono mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                                  {room.repo.full_name}
                                </span>
                              </span>
                              <Chip
                                className="rounded-md bg-slate-100 px-2 py-0 text-[10px] font-black text-slate-400"
                                color="default"
                                size="sm"
                                variant="soft"
                              >
                                {room.invite_code}
                              </Chip>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {createError !== null && (
                      <p
                        className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
                        role="alert"
                      >
                        {createError}
                      </p>
                    )}

                    <button
                      className="mt-1 flex h-9 w-full items-center justify-center rounded-xl bg-accent text-xs font-black text-accent-foreground shadow-md transition-colors hover:bg-todak-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isCreating}
                      type="submit"
                    >
                      {isCreating
                        ? '프로젝트 룸 생성 중...'
                        : '다음 단계로 이동 (프로필 설정)'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <FieldLabel htmlFor="team-invite-code" required>
                      팀 초대 코드 입력
                    </FieldLabel>
                    <Input
                      aria-label="팀 초대 코드"
                      className="h-9 rounded-xl border border-border bg-surface px-3.5 py-0 text-xs font-semibold text-slate-700 shadow-field placeholder:text-slate-400"
                      fullWidth
                      id="team-invite-code"
                      placeholder="12자리 초대 코드를 입력하세요"
                      required
                    />
                    <Link
                      className="flex h-9 w-full items-center justify-center rounded-xl bg-accent text-xs font-black text-accent-foreground shadow-md transition-colors hover:bg-todak-coral-600"
                      href={customizeHref('TODAK-INVITE')}
                    >
                      다음 단계로 이동 (프로필 설정)
                    </Link>
                  </div>
                )}
              </Tabs.Panel>
            ))}
          </Tabs>
        </Card.Content>
      </Card>
    </section>
  );
}
