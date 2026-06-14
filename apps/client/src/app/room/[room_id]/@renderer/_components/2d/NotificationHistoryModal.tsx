'use client';

import type { RoomNotification } from '@/services/notifications/model';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationQueryKeys } from '@/services/notifications/query';
import {
  updateNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/services/notifications/api';

interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: RoomNotification[];
  roomId: string;
}

function getModalLabel(type: string): string {
  switch (type) {
    case 'pr_opened':
      return 'PR OPENED';
    case 'pr_merged':
      return 'PR MERGED';
    case 'pr_reviewed':
      return 'PR REVIEWED';
    case 'new_issue':
      return 'NEW ISSUE';
    case 'minutes_generated':
      return 'MINUTES';
    case 'minutes_generation_failed':
      return 'MINUTES FAILED';
    case 'meeting_started':
      return 'MEETING START';
    case 'minutes_confirmed':
      return 'MINUTES DONE';
    default:
      return 'GITHUB NEWS';
  }
}

function formatModalTime(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function NotificationHistoryModal({
  isOpen,
  onClose,
  notifications,
  roomId,
}: NotificationHistoryModalProps) {
  const queryClient = useQueryClient();

  // 알림 읽음 처리
  const readMutation = useMutation({
    mutationFn: (payload: { all?: boolean; notification_ids?: string[] }) =>
      updateNotificationsRead(roomId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomId),
      });
    },
  });

  // 특정 알림 단건 삭제
  const deleteSingleMutation = useMutation({
    mutationFn: (notificationId: string) =>
      deleteNotification(roomId, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomId),
      });
    },
  });

  // 알림 전체 내역 일괄 삭제
  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllNotifications(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomId),
      });
    },
  });

  if (!isOpen) return null;

  const validNotifications = notifications.filter(n => !n.is_sample);

  const handleItemClick = (notif: RoomNotification) => {
    if (!notif.is_read) {
      readMutation.mutate({ notification_ids: [notif.id] });
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">
              토닥이의 알림 기록 보관함
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors text-xs font-bold"
          >
            닫기 ✖
          </button>
        </div>

        <div className="mx-4 mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100/50 flex items-start gap-2.5">
          <span className="text-xs shrink-0 mt-0.5">💡</span>
          <p className="text-[11px] font-medium text-blue-950 leading-relaxed">
            <strong className="text-blue-900 font-bold">토닥이 꿀팁:</strong>{' '}
            보관함을 직접 열지 않아도, 워크스페이스에 새로운 소식이 유입되면
            토닥이가 화면에서{' '}
            <span className="underline decoration-blue-400 font-bold">
              실시간 말풍선
            </span>
            으로 소식을 바로 안내해 드려요!
          </p>
        </div>

        {validNotifications.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-100/60 flex justify-end gap-2 bg-white">
            <button
              onClick={() => readMutation.mutate({ all: true })}
              disabled={readMutation.isPending}
              className="text-[10px] font-bold text-blue-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              ✔ 모두 읽음
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    '🚨 정말로 모든 알림 내역을 완전히 비우시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.',
                  )
                ) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending}
              className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              🗑 전체 삭제
            </button>
          </div>
        )}

        <div className="p-4 max-h-80 overflow-y-auto flex flex-col gap-2">
          {validNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-1">
              <p className="text-xs font-medium">
                아직 기록된 알림이 없습니다.
              </p>
            </div>
          ) : (
            validNotifications.map(notif => {
              const isUnread = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`group relative p-3 rounded-xl border flex items-start justify-between gap-3 transition-all cursor-pointer text-left
                    ${
                      isUnread
                        ? 'bg-indigo-50/40 border-indigo-100/80 hover:bg-indigo-50/70 border-l-4 border-l-blue-800 pl-2.5'
                        : 'bg-slate-50 border-slate-100/80 hover:bg-slate-100/60'
                    }`}
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black tracking-wide ${isUnread ? 'text-blue-800' : 'text-slate-400'}`}
                      >
                        {getModalLabel(notif.type)}
                      </span>
                      {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-800 animate-pulse shrink-0" />
                      )}
                    </div>

                    {notif.link ? (
                      <a
                        href={notif.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-slate-600 group-hover:text-slate-900 font-medium break-all underline-offset-2 hover:underline leading-relaxed"
                      >
                        {notif.message}
                      </a>
                    ) : (
                      <p className="text-xs text-slate-600 group-hover:text-slate-900 font-medium break-all leading-relaxed">
                        {notif.message}
                      </p>
                    )}

                    <span className="text-[9px] text-slate-400 font-todak-mono font-medium mt-0.5">
                      {formatModalTime(notif.created_at)}
                    </span>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (
                        window.confirm('이 알림을 목록에서 삭제하시겠습니까?')
                      ) {
                        deleteSingleMutation.mutate(notif.id);
                      }
                    }}
                    disabled={deleteSingleMutation.isPending}
                    className="text-slate-300 hover:text-rose-500 p-1 rounded-md hover:bg-white border border-transparent hover:border-slate-100 transition-all opacity-80 group-hover:opacity-100 text-[10px] shrink-0"
                    title="이 알림 삭제"
                  >
                    ✖
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-slate-50 bg-slate-50/50 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            알림을 클릭하면 읽음 처리되어 목록에서 사라집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
