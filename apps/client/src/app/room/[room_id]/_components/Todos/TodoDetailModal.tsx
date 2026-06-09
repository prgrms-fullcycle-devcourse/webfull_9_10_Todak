import { useTodoListStore } from '@/store/useTodoListStore';
import { Modal } from '@heroui/react';

export default function TodoDetailModal() {
  const modalContent = useTodoListStore(state => state.modalContent);
  const setIsModalOpen = useTodoListStore(state => state.setIsModalOpen);
  const isOpen = useTodoListStore(state => state.isOpen);
  if (!modalContent) return;
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
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsModalOpen}>
      <Modal.Container>
        <Modal.Dialog>
          <Modal.Header>
            sdkfjl
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body>
            <p>{id}</p>
            <p>{room_id}</p>
            <p>{title}</p>
            <p>{body}</p>
            {labels.map(label => (
              <p key={label}>{label}</p>
            ))}
            <p>{github_issue_number}</p>
            <p>{is_done}</p>
            <p>{minutes_id}</p>
            <p>{assignee?.github_username}</p>
            <p>{created_at}</p>
          </Modal.Body>
          <Modal.Footer>sdfasdf</Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
