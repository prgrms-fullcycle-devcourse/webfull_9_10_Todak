import { Todo } from '@/services/todos/model';
import Item from './Item';

export interface TodoListProps {
  isError: boolean;
  isPending: boolean;
  todos: Todo[];
}
export default function TodoList({ isError, isPending, todos }: TodoListProps) {
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
    <div className="grid max-h-[104px] grid-cols-2 gap-3 overflow-y-auto pr-1">
      {todos.map(todo => (
        <Item key={todo.id} {...todo} />
      ))}
    </div>
  );
}
