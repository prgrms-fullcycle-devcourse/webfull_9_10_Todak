'use client';

import { useState } from 'react';
import { fetchTodos, fetchMyTodos } from '@/services/todos/api';
import type { Todo, TodosResponse } from '@/services/todos/model';
import { useTodoListStore } from '@/store/useTodoListStore';
import { Button, Tabs } from '@heroui/react';
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
  const setModalContent = useTodoListStore(state => state.setModalContent);
  const setIsModalOpen = useTodoListStore(state => state.setIsModalOpen);

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
  const handleTodoPress = (todo: Todo) => {
    setModalContent(todo);
    setIsModalOpen(true);
  };

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={key => setActiveTab(key as 'team' | 'individual')}
      className="w-full gap-0"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <p className="shrink-0 text-[12px] font-bold text-foreground">
          To-Do 목록
        </p>

        <Tabs.ListContainer className="min-w-0">
          <Tabs.List className="flex w-max flex-nowrap overflow-hidden rounded-lg border border-border bg-white p-0 text-xs font-black">
            {MODAL_TAB_OPTIONS.map(option => (
              <Tabs.Tab
                className="h-7 whitespace-nowrap rounded-lg px-4 text-[11px] font-black text-muted transition-colors data-[selected=true]:bg-foreground data-[selected=true]:text-background"
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
            <p className="rounded-xl border border-dashed border-border py-4 text-center text-xs font-bold text-muted">
              표시할 할 일이 없습니다.
            </p>
          )}

          {!isPending && !isError && currentTodos.length > 0 && (
            <div className="max-h-55 flex flex-col gap-2.5 overflow-y-auto pr-1">
              {currentTodos.map(todo => (
                <Button
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs"
                  fullWidth
                  key={todo.id}
                  onPress={() => handleTodoPress(todo)}
                  type="button"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${
                        todo.is_done ? 'bg-success' : 'bg-warning'
                      }`}
                    />
                    <span className="truncate font-black text-foreground">
                      {todo.title}
                    </span>
                  </div>
                  <span className="ml-3 shrink-0 font-todak-mono text-[11px] font-black text-accent">
                    @{todo.assignee?.github_username ?? '미지정'}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
