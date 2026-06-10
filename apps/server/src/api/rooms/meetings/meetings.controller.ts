import { Response, NextFunction } from 'express';

import { getUserId } from '../../../middleware/auth.middleware.js';
import {
  endMeeting,
  getMeetingChats,
  listMeetings,
  startMeeting,
} from '../../../services/meeting.service.js';
import {
  createNotifications,
  getRoomMemberIds,
} from '../../../services/notifications.service.js';
import { getPrivateRooms } from '../../../services/private-room.service.js';
import { getIO } from '../../../socket/index.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { MeetingChatsQuery, StartMeetingBody } from './meetings.schema.js';

export async function getMeetingsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);

    const { roomId } = req.params as { roomId: string };

    const meetings = await listMeetings(roomId, userId);

    res.json(meetings);
  } catch (err) {
    next(err);
  }
}

export async function startMeetingHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);

    const { roomId } = req.params as { roomId: string };
    const { private_room_id } = req.body as StartMeetingBody;

    const meeting = await startMeeting(roomId, private_room_id, userId);

    const io = getIO();
    io.to(roomId).emit('meeting:started', {
      meetingId: meeting.id,
      hostId: meeting.host_id,
    });
    // is_meeting_active(false → true) 갱신을 다른 멤버 화면에 즉시 반영
    const privateRooms = await getPrivateRooms(roomId);
    io.to(roomId).emit('room:private-rooms-updated', privateRooms);

    // 알림(영속): 룸 전체에서 호스트(본인) 제외
    const members = await getRoomMemberIds(roomId);
    await createNotifications(
      members.filter(id => id !== userId),
      {
        roomId,
        type: 'meeting_started',
        message: '회의가 시작되었습니다.',
        link: `/room/${roomId}`,
      },
    );

    res.status(201).json(meeting);
  } catch (err) {
    next(err);
  }
}

export async function endMeetingHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);

    const { roomId, meetingId } = req.params as {
      roomId: string;
      meetingId: string;
    };

    const meeting = await endMeeting(roomId, meetingId, userId);

    const io = getIO();
    io.to(roomId).emit('meeting:ended', { meetingId: meeting.id });
    // is_meeting_active(true → false) 갱신을 다른 멤버 화면에 즉시 반영
    const privateRooms = await getPrivateRooms(roomId);
    io.to(roomId).emit('room:private-rooms-updated', privateRooms);

    res.json(meeting);
  } catch (err) {
    next(err);
  }
}

export async function getMeetingChatsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);

    const { roomId, meetingId } = req.params as {
      roomId: string;
      meetingId: string;
    };
    const { limit } = req.query as unknown as MeetingChatsQuery;

    const chats = await getMeetingChats(roomId, meetingId, userId, limit);

    res.json(chats);
  } catch (err) {
    next(err);
  }
}
