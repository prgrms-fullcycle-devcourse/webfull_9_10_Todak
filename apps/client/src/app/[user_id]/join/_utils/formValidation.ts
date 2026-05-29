export const GITHUB_REPOSITORY_NAME_INPUT_PATTERN = '[A-Za-z0-9_.\\-]{1,100}';

const GITHUB_REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
const INVITE_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export type CreateProjectFieldName = 'roomName' | 'repositoryName';
export type CreateProjectFieldErrors = Partial<
  Record<CreateProjectFieldName, string>
>;

export function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
}

export function getValidMaxMembers(value: number) {
  if (!Number.isFinite(value)) {
    return 4;
  }

  return Math.min(Math.max(Math.trunc(value), 2), 20);
}

export function validateGithubRepositoryName(name: string) {
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

export function validateCreateProjectForm(
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

export function splitInviteCode(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  return {
    first: normalized.slice(0, 4),
    second: normalized.slice(4, 8),
  };
}

export function validateInviteCode(inviteCode: string) {
  if (inviteCode === '') {
    return '초대 코드를 입력해주세요.';
  }

  if (!INVITE_CODE_PATTERN.test(inviteCode)) {
    return '초대 코드는 XXXX-XXXX 형식으로 입력해주세요.';
  }

  return null;
}
