'use client';

import { fetchMyTodos, fetchTodos } from '@/services/todos/api';
import { Button, Tabs } from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import TodoList, { TodoListProps } from './List';
import TodoDetailModal from './TodoDetailModal';

const TODO_TAB_OPTIONS = [
  {
    id: 'team',
    label: '전체 팀원 할 일',
  },
  {
    id: 'mine',
    label: '내 할 일',
  },
] as const;

type TodoTabId = (typeof TODO_TAB_OPTIONS)[number]['id'];

export default function BottomTodoTabs() {
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    data: teamTodos,
    isError: isTeamTodosError,
    isPending: isTeamTodosPending,
  } = useQuery({
    queryKey: ['todos', roomID],
    queryFn: () => fetchTodos(roomID),
  });
  const {
    data: myTodos,
    isError: isMyTodosError,
    isPending: isMyTodosPending,
  } = useQuery({
    queryKey: ['todos', roomID, 'me'],
    queryFn: () => fetchMyTodos(roomID),
  });

  const todoPanels: Record<
    TodoTabId,
    Pick<TodoListProps, 'isError' | 'isPending' | 'todos'>
  > = {
    team: {
      isError: isTeamTodosError,
      isPending: isTeamTodosPending,
      todos: teamTodos?.todos ?? [],
    },
    mine: {
      isError: isMyTodosError,
      isPending: isMyTodosPending,
      todos: myTodos?.todos ?? [],
    },
  };

  const handleRefreshTodos = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: ['todos', roomID],
        }),
        queryClient.invalidateQueries({
          exact: true,
          queryKey: ['todos', roomID, 'me'],
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <Tabs defaultSelectedKey="team" className="gap-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 truncate text-sm font-black text-foreground">
              📋 To-Do 목록
            </h2>
            <Button
              aria-label="To-Do 목록 새로고침"
              className="flex size-8 min-w-8 shrink-0 items-center justify-center bg-transparent p-0 text-muted hover:text-foreground disabled:opacity-60"
              isDisabled={isRefreshing}
              onPress={() => void handleRefreshTodos()}
              type="button"
            >
              <RefreshIcon isRefreshing={isRefreshing} />
            </Button>
          </div>
          <Tabs.ListContainer className="shrink-0">
            <Tabs.List className="overflow-hidden rounded-lg border border-border bg-surface p-0 text-xs font-black">
              {TODO_TAB_OPTIONS.map(option => (
                <Tabs.Tab
                  className="h-auto min-w-[96px] whitespace-nowrap rounded-none px-4 py-2 text-xs font-black text-muted transition-colors data-[selected=true]:bg-foreground data-[selected=true]:text-background"
                  key={`bottom-info-tabs-${option.id}`}
                  id={option.id}
                >
                  {option.label}
                  <Tabs.Indicator className="hidden" />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </div>

        {TODO_TAB_OPTIONS.map(option => (
          <Tabs.Panel
            className="mt-4 p-0 outline-none"
            key={`bottom-info-tabs-panel-${option.id}`}
            id={option.id}
          >
            <TodoList {...todoPanels[option.id]} />
          </Tabs.Panel>
        ))}
      </Tabs>
      <TodoDetailModal />
    </>
  );
}

function RefreshIcon({ isRefreshing }: { isRefreshing: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
