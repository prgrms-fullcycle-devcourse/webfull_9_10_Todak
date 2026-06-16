import { apiClient, api } from '@/lib/api';
import {
  EndMeeting,
  Minute,
  MinuteDetail,
  RefineMinutesRequest,
  RefineMinutesResponse,
  StartMeeting,
  UpdateMinutesRequest,
} from './model';

export async function fetchMeetingLogs(roomID: string) {
  return apiClient.get<Minute[]>(`/rooms/${roomID}/meetings`);
}

export function fetchMinutes(
  roomId: string,
  minutesId: string,
): Promise<MinuteDetail> {
  return apiClient.get<MinuteDetail>(`/rooms/${roomId}/minutes/${minutesId}`);
}

// 회의 시작/종료
export async function startMeeting(
  roomId: string,
  privateRoomId: string,
): Promise<StartMeeting> {
  const response = await api.post<StartMeeting>(`/rooms/${roomId}/meetings`, {
    private_room_id: privateRoomId,
  });
  return response.data;
}

export async function endMeeting(
  roomId: string,
  meetingId: string,
): Promise<EndMeeting> {
  const response = await api.post<EndMeeting>(
    `/rooms/${roomId}/meetings/${meetingId}/end`,
  );
  return response.data;
}

// ai 회의록 생성 요청
export function generateMinutes(
  roomId: string,
  meetingId: string,
  title: string,
): Promise<MinuteDetail> {
  return apiClient.post<MinuteDetail>(`/rooms/${roomId}/minutes/generate`, {
    meeting_id: meetingId,
    title,
  });
}

// 회의록 수정
export const updateMinutes = async (
  roomId: string,
  minutesId: string,
  data: UpdateMinutesRequest,
) => {
  return apiClient.patch(`/rooms/${roomId}/minutes/${minutesId}`, data);
};

export async function refineMinutes(
  roomId: string,
  minutesId: string,
  data: RefineMinutesRequest,
): Promise<RefineMinutesResponse> {
  return apiClient.post<RefineMinutesResponse>(
    `/rooms/${roomId}/minutes/${minutesId}/ai-refine`,
    data,
  );
}
