'use client';

import { fetchMyRooms } from '@/services/rooms/api';
import { Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface ExistingTeamsTabProps {
  userID: string;
}

export default function ExistingTeamsTab({ userID }: ExistingTeamsTabProps) {
  const { data: myRooms, isLoading } = useQuery({
    queryKey: ['myRooms'],
    queryFn: fetchMyRooms,
  });

  const customizeHref = (roomID: string) =>
    `/${encodeURIComponent(userID)}/join/customize?roomID=${encodeURIComponent(roomID)}`;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-background px-3.5 py-4 text-center text-[11px] font-bold text-slate-400">
        기존 팀 목록을 불러오는 중입니다.
      </div>
    );
  }

  if (!myRooms || myRooms.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-3.5 py-5 text-center text-[11px] font-bold leading-relaxed text-slate-400">
        아직 참여 중인 팀이 없습니다.
        <br />새 프로젝트를 만들거나 초대 코드로 참여해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-black text-slate-400">
        입장하실 방을 선택해주세요.
      </p>
      <div className="max-h-[282px] space-y-2 overflow-y-auto pr-1">
        {myRooms.map(room => (
          <Link
            className="group flex min-h-[50px] items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-sm transition-colors hover:border-todak-coral-200 hover:bg-todak-coral-50/60"
            key={`existing-team-list-${room.id}`}
            href={customizeHref(room.id)}
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-slate-800">
                {room.name}
              </span>
              <span className="todak-mono mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                {room.repo?.full_name ?? '연결된 레포지토리 없음'}
              </span>
            </span>
            <Chip
              className="rounded-md bg-slate-100 px-2 py-0 text-[10px] font-black text-slate-400"
              color="default"
              size="sm"
              variant="soft"
            >
              {room.invite_code}
            </Chip>
          </Link>
        ))}
      </div>
    </div>
  );
}
