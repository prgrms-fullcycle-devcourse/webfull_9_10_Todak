import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import {
  endMeeting,
  getMeetingChats,
  listMeetings,
  startMeeting,
} from '../../../services/meeting.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { MeetingChatsQuery, StartMeetingBody } from './meetings.schema.js';

export async function getMeetingsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

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
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId } = req.params as { roomId: string };
    const { private_room_id } = req.body as StartMeetingBody;

    const meeting = await startMeeting(roomId, private_room_id, userId);

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
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId, meetingId } = req.params as {
      roomId: string;
      meetingId: string;
    };

    const meeting = await endMeeting(roomId, meetingId, userId);

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
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

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
