'use client';

import { useState } from 'react';
import { fetchTodos, fetchMyTodos } from '@/services/todos/api';
import type { Todo, TodosResponse } from '@/services/todos/model';
import { Tabs } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

const MODAL_TAB_OPTIONS = [
  { id: 'team', label: '전체 팀원 할 일' },
  { id: 'individual', label: '할 일' },
] as const;

interface ModalTodoTabsProps {
  userId: string;
  isMe: boolean;
}

export default function ModalTodoTabs({ userId, isMe }: ModalTodoTabsProps) {
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const [activeTab, setActiveTab] = useState<'team' | 'individual'>('team');

  const isFetchingMyTodos = activeTab === 'individual' && isMe;
  const isFetchingMemberTodos = activeTab === 'individual' && !isMe;

  const {
    data: todosData,
    isPending,
    isError,
  } = useQuery<TodosResponse>({
    queryKey: isFetchingMyTodos
      ? ['my-todos', roomID]
      : isFetchingMemberTodos
        ? ['todos', roomID, 'member', userId]
        : ['todos', roomID],
    queryFn: () => {
      if (isFetchingMyTodos) return fetchMyTodos(roomID);

      if (isFetchingMemberTodos)
        return fetchTodos(roomID, { assignee_id: userId });

      return fetchTodos(roomID);
    },
  });

  const todos = todosData?.todos ?? [];

  const getFilteredTodos = (): Todo[] => {
    // 1. 전체 팀원 할 일 탭인 경우 -> 갓 파싱된 전체 데이터 반환
    if (activeTab === 'team') return todos;

    // 2. 할 일 탭인데 나인 경우 -> fetchMyTodos의 결과가 이미 todos에 들어있으므로 그대로 반환
    if (isMe) return todos;

    // 3. 할 일 탭인데 다른 팀원인 경우 -> 전체 데이터에서 해당 팀원 ID로 필터링
    return todos.filter(todo => String(todo.assignee?.id) === String(userId));
  };

  const currentTodos = getFilteredTodos();

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={key => setActiveTab(key as 'team' | 'individual')}
      className="w-full gap-0"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3 gap-4">
        <p className="text-xs font-black tracking-wider text-slate-400 shrink-0">
          TO-DO TASK 목록
        </p>

        <Tabs.ListContainer className="min-w-0">
          <Tabs.List className="overflow-hidden rounded-lg border border-border bg-surface p-0 text-xs font-black flex flex-nowrap w-max">
            {MODAL_TAB_OPTIONS.map(option => (
              <Tabs.Tab
                className="h-7 px-4 text-[11px] font-black text-slate-400 transition-colors data-[selected=true]:bg-slate-900 data-[selected=true]:text-white whitespace-nowrap rounded-lg"
                key={`modal-todo-tabs-${option.id}`}
                id={option.id}
              >
                {option.id === 'individual'
                  ? isMe
                    ? '내 할 일'
                    : '팀원 할 일'
                  : option.label}
                <Tabs.Indicator className="hidden" />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </div>

      {MODAL_TAB_OPTIONS.map(option => (
        <Tabs.Panel
          className="mt-4 outline-none"
          key={`modal-todo-tabs-panel-${option.id}`}
          id={option.id}
        >
          {isPending && (
            <p className="text-xs font-bold text-slate-400">
              할 일을 불러오는 중입니다...
            </p>
          )}
          {isError && (
            <p className="text-xs font-bold text-rose-500">
              할 일을 불러오지 못했습니다.
            </p>
          )}

          {!isPending && !isError && currentTodos.length === 0 && (
            <p className="text-xs font-bold text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">
              표시할 할 일이 없습니다.
            </p>
          )}

          {!isPending && !isError && currentTodos.length > 0 && (
            <div className="flex flex-col gap-2.5 max-h-55 overflow-y-auto pr-1">
              {currentTodos.map(todo => (
                <div
                  className="flex items-center justify-between rounded-xl border border-border bg-slate-50/50 px-4 py-3 text-xs shadow-sm"
                  key={todo.id}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${todo.is_done ? 'bg-emerald-500' : 'bg-orange-400'}`}
                    />
                    <span className="truncate font-bold text-slate-700">
                      {todo.title}
                    </span>
                  </div>
                  <span className="ml-3 shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                    @{todo.assignee?.github_username ?? '미지정'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
