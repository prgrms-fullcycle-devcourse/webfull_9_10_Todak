import { CreateRepoInput } from '../api/repos/repos.schema.js';

import { createRepo } from './github.service.js';

export async function createGithubRepo(
  accessToken: string,
  input: CreateRepoInput,
) {
  return createRepo(
    accessToken,
    input.name,
    input.private,
    input.org,
    input.auto_init,
  );
}
