'use client';

import { fetchMyTodos, fetchTodos } from '@/services/todos/api';
import { Tabs } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import TodoList, { TodoListProps } from './List';

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

  return (
    <Tabs defaultSelectedKey="team" className="gap-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="min-w-0 truncate text-sm font-black text-foreground">
          📋 가상 타운 실시간 To-Do (이슈 기준)
        </h2>
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
  );
}
