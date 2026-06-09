import { Todo } from '@/services/todos/model';
import { create } from 'zustand';

interface TodoListState {
  modalContent: Todo | undefined;
  isOpen: boolean;
  setModalContent: (payload: Todo) => void;
  setIsModalOpen: (payload: boolean) => void;
}

export const useTodoListStore = create<TodoListState>(set => ({
  modalContent: undefined,
  isOpen: false,
  setModalContent: payload => set(() => ({ modalContent: payload })),
  setIsModalOpen: payload => set(() => ({ isOpen: payload })),
}));
