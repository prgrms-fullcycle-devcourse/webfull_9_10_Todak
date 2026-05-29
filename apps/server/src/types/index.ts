import { Request } from 'express';

export interface ErrorInfo {
  statusCode: number;
  code: string;
  message: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    githubId: number;
    login: string;
    avatarUrl: string;
    githubAccessToken?: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type JobName =
  | 'ai-review'
  | 'github-sync'
  | 'notification'
  | 'minutes-generation'
  | 'chat-cleanup';
