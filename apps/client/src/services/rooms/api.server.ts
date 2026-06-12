import { apiServer } from '@/lib/api.server';
import { cache } from 'react';

import { PublicRoomInfo } from './model';

export const fetchRoomInfo = cache(async (roomID: string) => {
  return apiServer.get<PublicRoomInfo>(`/rooms/${roomID}/public`);
});
