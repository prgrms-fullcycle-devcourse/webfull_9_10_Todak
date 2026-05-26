import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

export const PrivateRoomParticipantSchema = registry.register(
  'PrivateRoomParticipant',
  z.object({
    user_id: z.string().uuid().openapi({ example: 'uuid-user-1' }),
    github_username: z.string().openapi({ example: 'jiyun-dev' }),
    entered_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-26T09:00:00.000Z' }),
  }),
);

export const PrivateRoomInfoSchema = registry.register(
  'PrivateRoomInfo',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-private-room-1' }),
    name: z.string().openapi({ example: '회의실 A' }),
    is_meeting_active: z.boolean().openapi({ example: false }),
    current_participants: z.array(PrivateRoomParticipantSchema),
  }),
);

export const PrivateRoomsResponseSchema = registry.register(
  'PrivateRoomsResponse',
  z.object({
    success: z.boolean(),
    data: z.array(PrivateRoomInfoSchema),
  }),
);

export const EnterPrivateRoomResponseSchema = registry.register(
  'EnterPrivateRoomResponse',
  z.object({
    private_room_id: z
      .string()
      .uuid()
      .openapi({ example: 'uuid-private-room-1' }),
    user_id: z.string().uuid().openapi({ example: 'uuid-user-1' }),
    entered_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:02:00.000Z' }),
  }),
);

export const LeavePrivateRoomResponseSchema = registry.register(
  'LeavePrivateRoomResponse',
  z.object({
    private_room_id: z
      .string()
      .uuid()
      .openapi({ example: 'uuid-private-room-1' }),
    user_id: z.string().uuid().openapi({ example: 'uuid-user-1' }),
    left_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:30:00.000Z' }),
    meeting_cancelled: z.boolean().openapi({ example: false }),
  }),
);
