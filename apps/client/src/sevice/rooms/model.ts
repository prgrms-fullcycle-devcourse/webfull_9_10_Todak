import type { Timestamp } from 'next/dist/server/lib/cache-handlers/types';

export type MyRoom = {
  id: string;
  name: string;
  status: string;
  invite_code: string;
  repo: { full_name: string };
  members: { github_username: string; avatar_url: string }[];
  member_count: number;
  last_synced_at: null | Timestamp;
  stats: null | string;
};

export type MyRooms = MyRoom[];

export type CreateRoomsParams = {
  name: string;
  repo_full_name: string;
  max_members?: number;
};

export type CreatedRoom = {
  id: string;
  name: string;
  invite_code: string;
  repo_full_name: string;
  webhook_registered: boolean;
};

export type JoinRoomParams = {
  invite_code: string;
};

export type JoinedRoom = {
  success: boolean;
  room_id: string;
  name: string;
};

export type CreateRoomProfileParams = {
  roomID: string;
  character_type: string;
  nickname: string;
  roles: string[];
  detailed_role: string;
};

export type RoomProfile = {
  github_username: string;
  avatar_url: string | null;
  roles: string[];
  detailed_role: string | null;
  character_type: string | null;
  nickname: string | null;
  status: string;
  is_host: boolean;
  pos_x: number;
  pos_y: number;
};
