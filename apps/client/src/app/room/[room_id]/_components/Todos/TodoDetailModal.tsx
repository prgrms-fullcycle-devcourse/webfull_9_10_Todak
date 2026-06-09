import { useTodoListStore } from '@/store/useTodoListStore';
import { Modal } from '@heroui/react';

export default function TodoDetailModal() {
  const modalContent = useTodoListStore(state => state.modalContent);
  const setIsModalOpen = useTodoListStore(state => state.setIsModalOpen);
  const isOpen = useTodoListStore(state => state.isOpen);

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsModalOpen}>
      <Modal.Container>
        <Modal.Dialog>
          <Modal.Header>
            sdkfjl
            <Modal.CloseTrigger />
          </Modal.Header>
          <Modal.Body>sdfasadsfasdfasfdsadfdf</Modal.Body>
          <Modal.Footer>sdfasdf</Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
