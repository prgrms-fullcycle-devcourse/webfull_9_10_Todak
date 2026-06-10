import { apiClient, api } from '@/lib/api';
import { EndMeeting, Minute, MinuteDetail, StartMeeting } from './model';

export async function fetchMeetingLogs(roomID: string) {
  return apiClient.get<Minute[]>(`/rooms/${roomID}/meetings`);
}

export function fetchMinutes(
  roomId: string,
  minutesId: string,
): Promise<MinuteDetail> {
  return apiClient.get<MinuteDetail>(`/rooms/${roomId}/minutes/${minutesId}`);
}

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
