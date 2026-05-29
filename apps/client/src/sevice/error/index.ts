import axios, { type AxiosError, type AxiosResponse } from 'axios';

export interface TodakError {
  success: boolean;
  error: string;
  code: string;
}

export type TodakApiError = AxiosError<TodakError> & {
  response: AxiosResponse<TodakError>;
};

export function isTodakError(value: unknown): value is TodakError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<TodakError>;

  return (
    typeof candidate.success === 'boolean' &&
    typeof candidate.error === 'string' &&
    typeof candidate.code === 'string'
  );
}

export function isTodakApiError(error: unknown): error is TodakApiError {
  return axios.isAxiosError(error) && isTodakError(error.response?.data);
}

export function isSystemError(error: unknown): error is Error {
  return error instanceof Error && !isTodakApiError(error);
}
