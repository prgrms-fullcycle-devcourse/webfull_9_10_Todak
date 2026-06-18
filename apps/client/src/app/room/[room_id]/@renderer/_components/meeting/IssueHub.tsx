'use client';

import { useState } from 'react';
import CompleteModal from './CompleteModal';
import ReviewModal from './ReviewModal';
import { ActionItem } from '@/services/minutes/model';
import { useRoomUiStore } from '@/store/useRoomUiStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { fetchTodos } from '@/services/todos/api';
import { useQuery } from '@tanstack/react-query';

interface IssueHubProps {
  actionItems: ActionItem[];
  minutesId: string | null;
  roomId: string;
  onSaveWithItems: (items: ActionItem[]) => Promise<void>;
  onActionItemsChange: (items: ActionItem[]) => void;
}

export default function IssueHub({
  actionItems,
  minutesId,
  roomId,
  onSaveWithItems,
  onActionItemsChange,
}: IssueHubProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<'none' | 'review' | 'complete'>('none');
  const [completedIssues, setCompletedIssues] = useState<ActionItem[]>([]);
  const setCurrentView = useRoomUiStore(state => state.setCurrentView);

  // 발행된 투두 조회 → title 기준으로 비활성화
  const { data: issuedTodos, refetch: refetchTodos } = useQuery({
    queryKey: ['todos', roomId, minutesId],
    queryFn: () => fetchTodos(roomId, { minutes_id: minutesId! }),
    enabled: !!minutesId && !!roomId,
  });

  const issuedTitles = new Set(issuedTodos?.todos.map(t => t.title) ?? []);

  const toggleSelect = (idx: number) => {
    if (issuedTitles.has(actionItems[idx]?.title)) return;
    setSelected(prev => {
      const next = new Set(prev);

      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }

      return next;
    });
  };

  const selectedItems = actionItems.filter((_, idx) => selected.has(idx));

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-surface">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-todak-coral-500">
            GITHUB ISSUE
          </p>
          <p className="text-xs font-black text-slate-800">
            GitHub 이슈 등록기
          </p>
        </div>
        {selected.size > 0 && (
          <span className="rounded-full bg-todak-coral-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {selected.size}개 선택됨
          </span>
        )}
      </div>

      {/* 이슈 카드 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
        {actionItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            AI가 추출한 액션 아이템이 없습니다
          </div>
        ) : (
          actionItems.map((item, idx) => {
            const isIssued = issuedTitles.has(item.title);
            return (
              <div
                key={idx}
                onClick={() => toggleSelect(idx)}
                className={`rounded-xl border p-3 transition-colors ${
                  isIssued
                    ? 'cursor-not-allowed border-slate-300 bg-slate-100 opacity-70'
                    : selected.has(idx)
                      ? 'cursor-pointer border-todak-coral-200 bg-todak-coral-50'
                      : 'cursor-pointer border-border bg-surface hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className={`mb-1 text-[10px] font-bold ${isIssued ? 'text-slate-800' : 'text-todak-coral-400'}`}
                    >
                      {isIssued ? '✓ ISSUED' : 'NEW ISSUE'}
                    </p>
                    <p className="text-xs font-bold leading-snug text-slate-800">
                      {item.title}
                    </p>
                    {item.assignee && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">
                          @{item.assignee.github_username}
                        </span>
                      </div>
                    )}
                    {item.labels.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {item.labels.map(label => (
                          <span
                            key={label}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isIssued && (
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selected.has(idx)
                          ? 'border-todak-coral-500 bg-todak-coral-500'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selected.has(idx) && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="shrink-0 border-t border-border p-3">
        <button
          onClick={() => setModal('review')}
          disabled={selected.size === 0}
          className="w-full rounded-xl bg-todak-coral-500 py-3 text-xs font-black text-white transition-all hover:bg-todak-coral-600 disabled:opacity-40"
        >
          이슈 검토 ({selected.size}개)
        </button>
      </div>

      {modal === 'review' && (
        <ReviewModal
          issues={selectedItems}
          onClose={() => setModal('none')}
          onUpload={async editedIssues => {
            const selectedIdxArray = Array.from(selected);
            const updatedItems = actionItems.map((item, idx) => {
              const editedIdx = selectedIdxArray.indexOf(idx);
              return editedIdx !== -1 ? editedIssues[editedIdx] : item;
            });

            setSelected(new Set());
            onActionItemsChange(updatedItems);
            await onSaveWithItems(updatedItems);

            // 투두 목록 갱신
            await refetchTodos();

            setCompletedIssues(editedIssues);
            setModal('complete');
          }}
          minutesId={minutesId}
          roomId={roomId}
        />
      )}
      {modal === 'complete' && (
        <CompleteModal
          issues={completedIssues}
          onClose={() => {
            setModal('none');
            setCurrentView('2d');
          }}
        />
      )}
    </div>
  );
}
