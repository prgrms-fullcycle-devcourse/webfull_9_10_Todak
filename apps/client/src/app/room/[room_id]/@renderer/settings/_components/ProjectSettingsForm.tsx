'use client';

import { isSystemError, isTodakApiError } from '@/services/error';
import { updateRoomSettings } from '@/services/rooms/api';
import type { RoomInfo, RoomProfile } from '@/services/rooms/model';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

interface ProjectSettingsFormProps {
  myRoomInfo?: RoomProfile;
  room: RoomInfo;
  roomID: string;
}

export default function ProjectSettingsForm({
  myRoomInfo,
  room,
  roomID,
}: ProjectSettingsFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(room.name);
  const [maxMembers, setMaxMembers] = useState(String(room.max_members));
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const repoLabel = room.repo?.full_name ?? '연동된 깃허브 없음';
  const canEdit = myRoomInfo?.is_host === true;

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      updateRoomSettings(roomID, {
        name: name.trim(),
        max_members: Number(maxMembers),
      }),
    onSuccess: updated => {
      setName(updated.name);
      setMaxMembers(String(updated.max_members));
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
      router.refresh();
      setSettingsError(null);
      setSuccessMessage('프로젝트 설정이 저장되었습니다.');
    },
    onError: error => {
      setSuccessMessage(null);

      if (isTodakApiError(error)) {
        setSettingsError(error.response.data.error);
        return;
      }

      if (isSystemError(error)) {
        setSettingsError(error.message);
        return;
      }

      setSettingsError('프로젝트 설정 저장에 실패했습니다.');
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (updateSettingsMutation.isPending || !canEdit) {
      return;
    }

    const trimmedName = name.trim();
    const nextMaxMembers = Number(maxMembers);

    if (trimmedName === '') {
      setSettingsError('룸 이름을 입력해주세요.');
      setSuccessMessage(null);
      return;
    }

    if (!Number.isInteger(nextMaxMembers)) {
      setSettingsError('최대 인원은 정수로 입력해주세요.');
      setSuccessMessage(null);
      return;
    }

    if (nextMaxMembers < 2 || nextMaxMembers > 20) {
      setSettingsError('최대 인원은 2명 이상 20명 이하로 입력해주세요.');
      setSuccessMessage(null);
      return;
    }

    if (nextMaxMembers < room.member_count) {
      setSettingsError('최대 인원은 현재 참여 인원보다 작을 수 없습니다.');
      setSuccessMessage(null);
      return;
    }

    setSettingsError(null);
    setSuccessMessage(null);
    updateSettingsMutation.mutate();
  };

  return (
    <section
      className="scroll-mt-6 rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel"
      id="project"
    >
      <p className="todak-section-label text-todak-coral-500">PROJECT</p>
      <h2 className="mt-2 text-lg font-black text-foreground">프로젝트 설정</h2>

      {!canEdit && (
        <p className="mt-4 rounded-xl bg-background px-3.5 py-3 text-[11px] font-bold text-muted">
          프로젝트 설정은 방장만 수정할 수 있습니다.
        </p>
      )}

      <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-xs font-black text-slate-700">
              룸 이름
            </span>
            <input
              className="todak-input h-9 rounded-xl px-3.5 py-0 text-xs font-semibold"
              disabled={updateSettingsMutation.isPending || !canEdit}
              maxLength={100}
              onChange={event => {
                setName(event.target.value);
                setSettingsError(null);
                setSuccessMessage(null);
              }}
              required
              value={name}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-xs font-black text-slate-700">
              최대 인원
            </span>
            <input
              className="todak-input h-9 rounded-xl px-3.5 py-0 text-xs font-semibold"
              disabled={updateSettingsMutation.isPending || !canEdit}
              max={20}
              min={Math.max(2, room.member_count)}
              onChange={event => {
                setMaxMembers(event.target.value);
                setSettingsError(null);
                setSuccessMessage(null);
              }}
              required
              type="number"
              value={maxMembers}
            />
          </label>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <SettingField label="연동된 깃허브" value={repoLabel} />
          <SettingField label="초대 코드" value={room.invite_code} />
          <SettingField
            label="현재 참여 인원"
            value={`${room.member_count}/${room.max_members}`}
          />
        </dl>

        {settingsError !== null && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
            role="alert"
          >
            {settingsError}
          </p>
        )}

        {successMessage !== null && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
            {successMessage}
          </p>
        )}

        <div className="flex justify-end">
          <button
            className="h-9 rounded-xl bg-foreground px-4 text-xs font-black text-background shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={updateSettingsMutation.isPending || !canEdit}
            type="submit"
          >
            {updateSettingsMutation.isPending ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </section>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3.5 py-3">
      <dt className="text-[10px] font-black text-muted">{label}</dt>
      <dd className="mt-1 truncate text-xs font-black text-foreground">
        {value}
      </dd>
    </div>
  );
}
