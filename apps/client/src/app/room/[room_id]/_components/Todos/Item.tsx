import { Todo } from '@/services/todos/model';
import { useTodoListStore } from '@/store/useTodoListStore';
import { Button } from '@heroui/react';

export default function Item(props: Todo) {
  const { id, is_done, title, assignee } = props;
  const setModalContent = useTodoListStore(state => state.setModalContent);
  const setIsModalOpen = useTodoListStore(state => state.setIsModalOpen);

  const handleOnPress = () => {
    setModalContent(props);
    setIsModalOpen(true);
  };

  return (
    <Button
      className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs"
      key={id}
      fullWidth
      onPress={handleOnPress}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`size-2.5 shrink-0 rounded-full ${
            is_done ? 'bg-success' : 'bg-warning'
          }`}
        />
        <span className="truncate font-black text-foreground">{title}</span>
      </div>
      <span className="ml-3 shrink-0 font-todak-mono text-[11px] font-black text-accent">
        @{assignee?.github_username ?? '미지정'}
      </span>
    </Button>
  );
}
