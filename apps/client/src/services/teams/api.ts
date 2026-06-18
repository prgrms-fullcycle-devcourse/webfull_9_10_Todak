import { apiClient } from '@/lib/api';
import { GitHubCollaborator, GitHubInvitation } from './model';

/**
 * 1. 수락 완료된 정식 협업자 목록 조회
 * 엔드포인트: GET /rooms/:roomId/repo/collaborators
 */
export async function fetchCollaborators(
  roomId: string,
): Promise<GitHubCollaborator[]> {
  // apiClient가 내부적으로 baseURL(/api)을 붙이고 response.data.data를 자동으로 추출해 반환합니다.
  return apiClient.get<GitHubCollaborator[]>(
    `/rooms/${roomId}/repo/collaborators`,
  );
}

/**
 * 2. 보류 중인 깃허브 초대 대기자 목록 조회
 * 엔드포인트: GET /rooms/:roomId/repo/collaborators/invitations
 */
export async function fetchInvitations(
  roomId: string,
): Promise<GitHubInvitation[]> {
  return apiClient.get<GitHubInvitation[]>(
    `/rooms/${roomId}/repo/collaborators/invitations`,
  );
}

/**
 * 3. 신규 협업자 초대장 발송 (방장 전용)
 * 엔드포인트: POST /rooms/:roomId/repo/collaborators
 */
export async function inviteCollaborator(
  roomId: string,
  username: string,
): Promise<{ success: boolean }> {
  return apiClient.post<
    { success: boolean },
    { username: string; permission: string }
  >(`/rooms/${roomId}/repo/collaborators`, {
    username,
    permission: 'push', // 백엔드 스키마 스펙에 맞춰 기본 push(Write) 권한 주입
  });
}

/**
 * 4. 보류 중인 초대 전송 취소 (방장 전용)
 * 엔드포인트: DELETE /rooms/:roomId/repo/collaborators/invitations/:invitationId
 */
export async function cancelInvitation(
  roomId: string,
  invitationId: number,
): Promise<void> {
  return apiClient.delete<void>(
    `/rooms/${roomId}/repo/collaborators/invitations/${invitationId}`,
  );
}

/**
 * 5. 협업자 레포지토리 추방 및 제거 (방장 전용)
 * 엔드포인트: DELETE /rooms/:roomId/repo/collaborators/:username
 */
export async function removeCollaborator(
  roomId: string,
  username: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/rooms/${roomId}/repo/collaborators/${username}`,
  );
}
