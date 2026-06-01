import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

import {
  assertPrivateRoomBelongsToRoom,
  assertRoomMember,
} from './chat.service.js';

export interface MeetingChat {
  id: string;
  user: {
    github_username: string;
    avatar_url: string | null;
  };
  content: string | null;
  type: string;
  created_at: string;
}

export interface MeetingSummary {
  id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  participant_count: number;
  message_count: number;
  minutes_id: string | null;
}

export interface StartMeetingResult {
  id: string;
  status: string;
  started_at: string;
  host_id: string;
  participants: string[];
}

export interface EndMeetingResult {
  id: string;
  status: string;
  ended_at: string;
  message_count: number;
}

interface MeetingWindow {
  roomId: string;
  privateRoomId: string;
  startedAt: Date;
  endedAt: Date | null;
}

/*
 * 회의 구간([started_at, ended_at])에 해당 프라이빗 룸에서 오간
 * 일반 채팅(type === 'text')을 고르는 where 절. 진행 중 회의는 ended_at 대신 현재 시각을 사용.
 */
function meetingChatWhere(meeting: MeetingWindow) {
  return {
    roomId: meeting.roomId,
    privateRoomId: meeting.privateRoomId,
    type: 'text',
    createdAt: {
      gte: meeting.startedAt,
      lte: meeting.endedAt ?? new Date(),
    },
  };
}

// 채팅 참여자 목록에 호스트를 항상 포함시킨다.
function withHost(userIds: string[], hostId: string): string[] {
  return userIds.includes(hostId) ? userIds : [hostId, ...userIds];
}

async function getMeetingChatterIds(meeting: MeetingWindow): Promise<string[]> {
  const rows = await prisma.chatMessage.findMany({
    where: meetingChatWhere(meeting),
    select: { userId: true },
    distinct: ['userId'],
  });

  return rows.map(row => row.userId);
}

// 회의 중 채팅을 남긴 유저를 MeetingParticipant 로 스냅샷 (중복 제외).
async function snapshotParticipants(
  meetingId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const existing = await prisma.meetingParticipant.findMany({
    where: { meetingId },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map(row => row.userId));

  const toCreate = userIds.filter(id => !existingIds.has(id));
  if (toCreate.length === 0) {
    return;
  }

  await prisma.meetingParticipant.createMany({
    data: toCreate.map(userId => ({ meetingId, userId })),
  });
}

/*
 * 회의 시작 (프라이빗 룸 내 버튼 클릭).
 * 같은 프라이빗 룸에 이미 진행 중인 회의가 있으면 새로 만들지 않고 그대로 반환(멱등).
 */
export async function startMeeting(
  roomId: string,
  privateRoomId: string,
  userId: string,
): Promise<StartMeetingResult> {
  await assertRoomMember(roomId, userId);
  await assertPrivateRoomBelongsToRoom(roomId, privateRoomId);

  const ongoing = await prisma.meeting.findFirst({
    where: { roomId, privateRoomId, status: 'ongoing' },
  });

  if (ongoing !== null) {
    const chatterIds = await getMeetingChatterIds(ongoing);

    return {
      id: ongoing.id,
      status: ongoing.status,
      started_at: ongoing.startedAt.toISOString(),
      host_id: ongoing.hostId,
      participants: withHost(chatterIds, ongoing.hostId),
    };
  }

  const meeting = await prisma.meeting.create({
    data: { roomId, privateRoomId, hostId: userId, status: 'ongoing' },
  });

  await prisma.meetingParticipant.create({
    data: { meetingId: meeting.id, userId },
  });

  return {
    id: meeting.id,
    status: meeting.status,
    started_at: meeting.startedAt.toISOString(),
    host_id: meeting.hostId,
    participants: [userId],
  };
}

/*
 * 회의 종료 (룸 멤버 누구나 호출 가능).
 * 회의 구간에 채팅을 남긴 사람을 참여자로 스냅샷하고 메시지 수를 반환. 이미 종료된 회의면 기존 값을 그대로 반환(멱등).
 */
export async function endMeeting(
  roomId: string,
  meetingId: string,
  userId: string,
): Promise<EndMeetingResult> {
  await assertRoomMember(roomId, userId);

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, roomId },
  });

  if (meeting === null) {
    throw new AppError('MEETING_NOT_FOUND');
  }

  const now = new Date();
  const endedAt = meeting.endedAt ?? now;
  const status = meeting.status === 'ongoing' ? 'ended' : meeting.status;

  if (meeting.status === 'ongoing') {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: 'ended', endedAt: now },
    });
  }

  const messages = await prisma.chatMessage.findMany({
    where: meetingChatWhere({ ...meeting, endedAt }),
    select: { userId: true },
  });

  const chatterIds = Array.from(new Set(messages.map(row => row.userId)));
  await snapshotParticipants(meeting.id, chatterIds);

  return {
    id: meeting.id,
    status,
    ended_at: endedAt.toISOString(),
    message_count: messages.length,
  };
}

/*
 * 회의 목록 조회.
 * participant_count / message_count 는 회의 구간 채팅을 기준으로 계산한다.
 */
export async function listMeetings(
  roomId: string,
  userId: string,
): Promise<MeetingSummary[]> {
  await assertRoomMember(roomId, userId);

  const meetings = await prisma.meeting.findMany({
    where: { roomId },
    orderBy: { startedAt: 'desc' },
    include: { minutes: { select: { id: true } } },
  });

  return Promise.all(
    meetings.map(async meeting => {
      const messages = await prisma.chatMessage.findMany({
        where: meetingChatWhere(meeting),
        select: { userId: true },
      });
      const participantIds = withHost(
        Array.from(new Set(messages.map(row => row.userId))),
        meeting.hostId,
      );

      return {
        id: meeting.id,
        status: meeting.status,
        started_at: meeting.startedAt.toISOString(),
        ended_at: meeting.endedAt?.toISOString() ?? null,
        participant_count: participantIds.length,
        message_count: messages.length,
        minutes_id: meeting.minutes?.id ?? null,
      };
    }),
  );
}

/*
 * 특정 회의 구간 채팅 추출 (회의록 생성용).
 * 회의 started_at ~ ended_at 구간의 일반 채팅을 시간순(ASC)으로 반환.
 */
export async function getMeetingChats(
  roomId: string,
  meetingId: string,
  userId: string,
  limit?: number,
): Promise<MeetingChat[]> {
  await assertRoomMember(roomId, userId);

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, roomId },
  });

  if (meeting === null) {
    throw new AppError('MEETING_NOT_FOUND');
  }

  const rows = await prisma.chatMessage.findMany({
    where: meetingChatWhere(meeting),
    orderBy: { createdAt: 'asc' },
    ...(limit !== undefined && { take: limit }),
    include: {
      user: { select: { githubUsername: true, avatarUrl: true } },
    },
  });

  return rows.map(row => ({
    id: row.id,
    user: {
      github_username: row.user.githubUsername,
      avatar_url: row.user.avatarUrl,
    },
    content: row.content,
    type: row.type,
    created_at: row.createdAt.toISOString(),
  }));
}
