'use client';

import { fetchMyTodos, fetchTodos } from '@/sevice/todos/api';
import type { Todo } from '@/sevice/todos/model';
import { Tabs } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

const TODO_TAB_OPTIONS = [
  {
    id: 'team',
    label: '전체 팀원 할 일',
  },
  {
    id: 'mine',
    label: '내 할 일만',
  },
] as const;

type TodoTabId = (typeof TODO_TAB_OPTIONS)[number]['id'];

interface TodoListProps {
  isError: boolean;
  isPending: boolean;
  todos: Todo[];
}

function TodoList({ isError, isPending, todos }: TodoListProps) {
  if (isPending) {
    return (
      <p className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs font-black text-muted">
        할 일을 불러오는 중입니다...
      </p>
    );
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs font-black text-danger">
        할 일을 불러오지 못했습니다.
      </p>
    );
  }

  if (todos.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs font-black text-muted">
        표시할 할 일이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {todos.map(todo => (
        <div
          className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs shadow-surface"
          key={todo.id}
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
        </div>
      ))}
    </div>
  );
}

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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-foreground">
          📋 가상 타운 실시간 To-Do (이슈 기준)
        </h2>
        <Tabs.ListContainer>
          <Tabs.List className="overflow-hidden rounded-lg border border-border bg-surface p-0 text-xs font-black">
            {TODO_TAB_OPTIONS.map(option => (
              <Tabs.Tab
                className="h-auto min-w-0 rounded-none px-4 py-2 text-xs font-black text-muted transition-colors data-[selected=true]:bg-foreground data-[selected=true]:text-background"
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
