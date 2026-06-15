import { create } from 'zustand';

interface ChatNotificationState {
  isChatOpen: boolean;
  unreadChatCount: number;
  setChatOpen: (open: boolean) => void;
  notifyIncomingMessage: () => void;
  clearUnreadChatCount: () => void;
}

export const useChatNotificationStore = create<ChatNotificationState>()(
  set => ({
    isChatOpen: false,
    unreadChatCount: 0,
    setChatOpen: open =>
      set(state => ({
        isChatOpen: open,
        unreadChatCount: open ? 0 : state.unreadChatCount,
      })),
    notifyIncomingMessage: () =>
      set(state => {
        if (state.isChatOpen) return state;
        return { unreadChatCount: state.unreadChatCount + 1 };
      }),
    clearUnreadChatCount: () => set({ unreadChatCount: 0 }),
  }),
);
