'use client';

import { cn } from '@/lib/cn';
import { isSystemError, isTodakApiError } from '@/sevice/error';
import { createRepository } from '@/sevice/repos';
import { createRooms, fetchMyRooms } from '@/sevice/rooms';
import {
  Chip,
  FieldError,
  Input,
  Label,
  NumberField,
  TextField,
} from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState } from 'react';

const GITHUB_REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
const GITHUB_REPOSITORY_NAME_INPUT_PATTERN = '[A-Za-z0-9_.\\-]{1,100}';
const INPUT_CLASS_NAME =
  'h-9 rounded-xl border border-border bg-surface px-3.5 py-0 text-xs font-semibold text-slate-700 shadow-field placeholder:text-slate-400 focus:border-accent';
const INVALID_INPUT_CLASS_NAME =
  'border-danger focus:border-danger data-[invalid=true]:border-danger';

type CreateProjectFieldName = 'roomName' | 'repositoryName';
type CreateProjectFieldErrors = Partial<Record<CreateProjectFieldName, string>>;

interface CreateTabProps {
  userID: string;
}

function FieldLabel({
  children,
  htmlFor,
  id,
  required = false,
}: {
  children: ReactNode;
  htmlFor: string;
  id?: string;
  required?: boolean;
}) {
  return (
    <Label
      className="flex items-center gap-1 text-xs font-black text-slate-700"
      htmlFor={htmlFor}
      id={id}
      isRequired={required}
    >
      <span>{children}</span>
      {required && (
        <span aria-hidden="true" className="text-todak-coral-500">
          *
        </span>
      )}
      {required && <span className="sr-only">필수</span>}
    </Label>
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

function validateGithubRepositoryName(name: string) {
  if (name === '') {
    return 'GitHub 레포지토리 이름을 입력해주세요.';
  }

  if (!GITHUB_REPOSITORY_NAME_PATTERN.test(name)) {
    return 'GitHub 레포지토리 이름은 1~100자의 영문, 숫자, -, _, . 만 사용할 수 있습니다.';
  }

  if (name === '.' || name === '..') {
    return 'GitHub 레포지토리 이름으로 . 또는 .. 은 사용할 수 없습니다.';
  }

  if (name.toLowerCase().endsWith('.git')) {
    return 'GitHub 레포지토리 이름은 .git 으로 끝날 수 없습니다.';
  }

  return null;
}

function validateCreateProjectForm(
  roomName: string,
  repositoryName: string,
): CreateProjectFieldErrors {
  const errors: CreateProjectFieldErrors = {};

  if (roomName === '') {
    errors.roomName = '프로젝트 룸 이름을 입력해주세요.';
  }

  const repositoryNameError = validateGithubRepositoryName(repositoryName);

  if (repositoryNameError !== null) {
    errors.repositoryName = repositoryNameError;
  }

  return errors;
}

export default function CreateTab({ userID }: CreateTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CreateProjectFieldErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [maxMembers, setMaxMembers] = useState(4);

  const { data: myRooms } = useQuery({
    queryKey: ['myRooms'],
    queryFn: fetchMyRooms,
  });

  const customizeHref = (roomID: string) =>
    `/${encodeURIComponent(userID)}/join/customize?roomID=${encodeURIComponent(roomID)}`;

  function clearFieldError(fieldName: CreateProjectFieldName) {
    setFieldErrors(prev => {
      if (prev[fieldName] === undefined) {
        return prev;
      }

      const next = { ...prev };
      delete next[fieldName];

      return next;
    });
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreating) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const roomName = getFormString(formData, 'roomName');
    const repositoryName = getFormString(formData, 'repositoryName');
    const nextFieldErrors = validateCreateProjectForm(roomName, repositoryName);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setCreateError(null);
      return;
    }

    setFieldErrors({});
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
    <form className="space-y-4" noValidate onSubmit={handleCreateProject}>
      <div className="space-y-2">
        <TextField
          aria-labelledby="project-room-name-label"
          className="space-y-2"
          isInvalid={fieldErrors.roomName !== undefined}
          isRequired
        >
          <FieldLabel
            htmlFor="project-room-name"
            id="project-room-name-label"
            required
          >
            프로젝트 룸 이름
          </FieldLabel>
          <Input
            aria-errormessage="project-room-name-error"
            aria-label="프로젝트 룸 이름"
            className={cn(INPUT_CLASS_NAME, {
              [INVALID_INPUT_CLASS_NAME]: fieldErrors.roomName !== undefined,
            })}
            disabled={isCreating}
            fullWidth
            id="project-room-name"
            maxLength={100}
            name="roomName"
            onChange={() => clearFieldError('roomName')}
            placeholder="프로젝트 룸 이름을 입력하세요"
            required
          />
          {fieldErrors.roomName !== undefined && (
            <FieldError
              className="text-[11px] font-bold text-danger"
              id="project-room-name-error"
            >
              {fieldErrors.roomName}
            </FieldError>
          )}
        </TextField>

        <TextField
          aria-labelledby="github-repository-name-label"
          className="space-y-2"
          isInvalid={fieldErrors.repositoryName !== undefined}
          isRequired
        >
          <FieldLabel
            htmlFor="github-repository-name"
            id="github-repository-name-label"
            required
          >
            GitHub 레포지토리 이름
          </FieldLabel>
          <Input
            aria-errormessage="github-repository-name-error"
            aria-label="GitHub 레포지토리 이름"
            className={cn(INPUT_CLASS_NAME, {
              [INVALID_INPUT_CLASS_NAME]:
                fieldErrors.repositoryName !== undefined,
            })}
            disabled={isCreating}
            fullWidth
            id="github-repository-name"
            maxLength={100}
            name="repositoryName"
            onChange={() => clearFieldError('repositoryName')}
            pattern={GITHUB_REPOSITORY_NAME_INPUT_PATTERN}
            placeholder="레포지토리 이름을 입력하세요"
            required
            title="1~100자의 영문, 숫자, -, _, . 만 사용할 수 있습니다. 단, . 또는 .. 단독 이름과 .git으로 끝나는 이름은 사용할 수 없습니다."
          />
          {fieldErrors.repositoryName !== undefined && (
            <FieldError
              className="text-[11px] font-bold text-danger"
              id="github-repository-name-error"
            >
              {fieldErrors.repositoryName}
            </FieldError>
          )}
        </TextField>

        <FieldLabel htmlFor="project-max-members">최대 인원</FieldLabel>
        <NumberField
          aria-label="최대 인원"
          isDisabled={isCreating}
          maxValue={20}
          minValue={2}
          onChange={value => setMaxMembers(Number.isFinite(value) ? value : 4)}
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
            <div className="space-y-2">참여 중인 프로젝트가 없습니다.</div>
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
  );
}
