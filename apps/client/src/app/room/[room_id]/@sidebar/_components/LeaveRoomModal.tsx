'use client';

import { getSocket } from '@/lib/socket';
import { isSystemError, isTodakApiError } from '@/services/error';
import { leaveRoom } from '@/services/rooms/api';
import type { MyRooms } from '@/services/rooms/model';
import { useSpaceStore } from '@/store/useSpaceStore';
import { Button, Modal } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LeaveRoomModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  roomID: string;
  userID: string;
}

export default function LeaveRoomModal({
  isOpen,
  onOpenChange,
  roomID,
  userID,
}: LeaveRoomModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const leaveRoomMutation = useMutation({
    mutationFn: () => leaveRoom(roomID),
    onSuccess: () => {
      getSocket().emit('room:leave', roomID);
      queryClient.setQueryData<MyRooms>(['myRooms'], rooms =>
        rooms?.filter(room => room.id !== roomID),
      );

      const spaceStore = useSpaceStore.getState();
      spaceStore.setMembers([]);
      spaceStore.setPrivateRooms([]);
      spaceStore.setCurrentPrivateRoomId(null);
      spaceStore.setCurrentMeetingId(null);
      spaceStore.setCurrentMinutesId(null);
      spaceStore.closeCharacterModal();
      spaceStore.setMyChar({ id: '', githubUsername: '' });

      router.replace(`/${encodeURIComponent(userID)}/join`);
      router.refresh();
    },
    onError: error => {
      if (isTodakApiError(error)) {
        setLeaveError(error.response.data.error);
        return;
      }

      if (isSystemError(error)) {
        setLeaveError(error.message);
        return;
      }

      setLeaveError('룸 나가기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    },
  });

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (leaveRoomMutation.isPending) {
      return;
    }

    if (!nextIsOpen) {
      setLeaveError(null);
    }

    onOpenChange(nextIsOpen);
  };

  const handleLeave = () => {
    if (leaveRoomMutation.isPending) {
      return;
    }

    setLeaveError(null);
    leaveRoomMutation.mutate();
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="w-full max-w-[380px] rounded-[26px] border border-border/80 bg-surface px-5 py-5 shadow-todak-panel">
          <Modal.Header className="flex items-start justify-between gap-4 px-0 pb-3 pt-0">
            <div className="min-w-0">
              <p className="todak-section-label text-todak-coral-500">
                LEAVE ROOM
              </p>
              <Modal.Heading className="text-[18px] font-black leading-tight text-foreground">
                룸에서 나가시겠습니까?
              </Modal.Heading>
            </div>
            <Modal.CloseTrigger />
          </Modal.Header>

          <Modal.Body className="space-y-3 px-0">
            <p className="text-xs font-semibold leading-relaxed text-muted">
              나간 후에는 룸 선택 및 생성 페이지로 이동합니다.
            </p>
            {leaveError !== null && (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
                role="alert"
              >
                {leaveError}
              </p>
            )}
          </Modal.Body>

          <Modal.Footer className="mt-5 flex justify-end gap-2 border-t border-border px-0 pb-0 pt-4">
            <Button
              className="h-9 rounded-xl bg-surface-secondary px-4 text-xs font-black text-muted"
              isDisabled={leaveRoomMutation.isPending}
              onPress={() => handleOpenChange(false)}
              type="button"
              variant="ghost"
            >
              취소
            </Button>
            <Button
              className="h-9 rounded-xl bg-red-500 px-4 text-xs font-black text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
              isDisabled={leaveRoomMutation.isPending}
              onPress={handleLeave}
              type="button"
            >
              {leaveRoomMutation.isPending ? '나가는 중...' : '나가기'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
