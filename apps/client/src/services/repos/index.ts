import { apiClient } from '@/lib/api';

export type CreateRepositoryParams = {
  name: string;
  org?: string;
  private?: boolean;
  auto_init?: boolean;
};

export type CreatedRepository = {
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
};

export async function createRepository(
  params: CreateRepositoryParams,
): Promise<CreatedRepository> {
  const {
    auto_init = true,
    private: isPrivate = false,
    ...repoParams
  } = params;

  return apiClient.post<CreatedRepository, CreateRepositoryParams>('/repos', {
    ...repoParams,
    private: isPrivate,
    auto_init,
  });
}
