import { useDeleteTodos } from '@/services/todos/query';
import { useTodoListStore } from '@/store/useTodoListStore';
import { Button, Modal } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function TodoDetailModal() {
  const queryClient = useQueryClient();
  const deleteTodoMutation = useDeleteTodos();
  const modalContent = useTodoListStore(state => state.modalContent);
  const setIsModalOpen = useTodoListStore(state => state.setIsModalOpen);
  const isOpen = useTodoListStore(state => state.isOpen);

  if (!modalContent) return null;

  const {
    id,
    room_id,
    title,
    body,
    labels,
    github_issue_number,
    is_done,
    minutes_id,
    assignee,
    created_at,
  } = modalContent;

  const closeModal = () => setIsModalOpen(false);
  const assigneeName = assignee?.github_username ?? '미지정';
  const issueLabel =
    github_issue_number !== null ? `#${github_issue_number}` : '연결 없음';
  const minutesLabel = minutes_id ?? '연결 없음';

  const handleDeleteTodo = () => {
    deleteTodoMutation.mutate(
      { roomID: room_id, todoID: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['todos', room_id] });
          queryClient.invalidateQueries({ queryKey: ['my-todos', room_id] });
          closeModal();
        },
      },
    );
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsModalOpen}>
      <Modal.Container>
        <Modal.Dialog className="w-full max-w-lg rounded-[26px] border border-slate-100 bg-white px-5 py-5 shadow-xl">
          <Modal.Header className="flex items-start justify-between gap-4 px-0 pb-3 pt-0">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${
                    is_done ? 'bg-success' : 'bg-warning'
                  }`}
                />
                <span className="text-[11px] font-black text-slate-400">
                  {is_done ? '완료된 To-Do' : '진행 중인 To-Do'}
                </span>
              </div>
              <h3 className="line-clamp-2 text-[17px] font-black leading-snug text-slate-800">
                {title}
              </h3>
            </div>
            <Modal.CloseTrigger />
          </Modal.Header>

          <Modal.Body className="flex max-w-120 flex-col gap-4 px-0">
            <section className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4 shadow-sm">
              <div className="grid gap-2 text-[11px] font-bold text-slate-500 sm:grid-cols-2">
                <div className="rounded-lg bg-white px-3 py-2.5">
                  <span className="block text-slate-400">담당자</span>
                  <span className="font-todak-mono text-slate-700">
                    @{assigneeName}
                  </span>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5">
                  <span className="block text-slate-400">GitHub Issue</span>
                  <span className="font-todak-mono text-todak-coral-500">
                    {issueLabel}
                  </span>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5">
                  <span className="block text-slate-400">회의록</span>
                  <span className="block truncate font-todak-mono text-slate-700">
                    {minutesLabel}
                  </span>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5">
                  <span className="block text-slate-400">생성일</span>
                  <span className="text-slate-700">
                    {formatCreatedAt(created_at)}
                  </span>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-[11px] font-black text-slate-400">본문</h4>
              <div className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold leading-relaxed text-slate-600">
                {body?.trim() || '등록된 상세 내용이 없습니다.'}
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-[11px] font-black text-slate-400">라벨</h4>
              <div className="flex flex-wrap gap-1.5">
                {labels.length > 0 ? (
                  labels.map(label => (
                    <span
                      className="rounded-full border border-todak-coral-200 bg-todak-coral-50 px-2.5 py-1 text-[10px] font-black text-todak-coral-500"
                      key={label}
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-400">
                    라벨 없음
                  </span>
                )}
              </div>
            </section>
          </Modal.Body>

          <Modal.Footer className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 px-0 pb-0 pt-4">
            <Button
              fullWidth
              className="shrink-0 rounded-lg bg-danger px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-danger/90 focus:outline-none focus:ring-2 focus:ring-danger/30 disabled:opacity-60"
              isDisabled={deleteTodoMutation.isPending}
              onPress={handleDeleteTodo}
              type="button"
            >
              {deleteTodoMutation.isPending ? '삭제 중...' : '삭제하기'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
