import { Timestamp } from 'next/dist/server/lib/cache-handlers/types';

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
