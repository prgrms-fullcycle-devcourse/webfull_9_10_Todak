import { apiClient } from '@/lib/api';

import type {
  FetchRoomPullRequestsParams,
  PullRequestsResponse,
} from './model';

export function fetchRoomPullRequests({
  roomId,
  state = 'open',
  page = 1,
  limit = 30,
}: FetchRoomPullRequestsParams): Promise<PullRequestsResponse> {
  return apiClient.get<PullRequestsResponse>(`/rooms/${roomId}/prs`, {
    params: { limit, page, state },
  });
}
