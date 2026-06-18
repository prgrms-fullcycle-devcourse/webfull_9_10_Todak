import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { CharacterInfo } from './useSpaceStore';
import type { RoomProfile } from '../services/rooms/model';

export type ViewType = '2d' | 'meeting';
export type ChatTabType = 'all' | 'private';

interface RoomUiState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  isMenuOpen: boolean;
  menuPos: { x: number; y: number };
  setMenuOpen: (open: boolean) => void;
  setMenuPos: (x: number, y: number) => void;

  isCharacterModalOpen: boolean;
  selectedMember: RoomProfile | CharacterInfo | null;
  openCharacterModal: (member: RoomProfile | CharacterInfo) => void;
  closeCharacterModal: () => void;

  activeChatTab: ChatTabType;
  setActiveChatTab: (tab: ChatTabType) => void;

  currentMinutesId: string | null;
  setCurrentMinutesId: (id: string | null) => void;
  meetingMinutesUpdateSeq: number;
  notifyMeetingMinutesUpdated: () => void;
  minutesGenerationNoticeSeq: number;
  notifyMinutesGenerationRequested: () => void;

  isExitModalOpen: boolean;
  exitModalCallback: ((confirm: boolean) => void) | null;
  openExitModal: (callback: (confirm: boolean) => void) => void;
  closeExitModal: () => void;
}

export const useRoomUiStore = create<RoomUiState>()(
  subscribeWithSelector(set => ({
    currentView: '2d',
    setCurrentView: view => set({ currentView: view }),

    isSidebarOpen: true,
    setSidebarOpen: open => set({ isSidebarOpen: open }),
    toggleSidebar: () =>
      set(state => ({ isSidebarOpen: !state.isSidebarOpen })),

    isMenuOpen: false,
    menuPos: { x: 0, y: 0 },
    setMenuOpen: open => set({ isMenuOpen: open }),
    setMenuPos: (x, y) => set({ menuPos: { x, y } }),

    isCharacterModalOpen: false,
    selectedMember: null,
    openCharacterModal: member =>
      set({ isCharacterModalOpen: true, selectedMember: member }),
    closeCharacterModal: () =>
      set({ isCharacterModalOpen: false, selectedMember: null }),

    activeChatTab: 'all',
    setActiveChatTab: tab => set({ activeChatTab: tab }),

    currentMinutesId: null,
    setCurrentMinutesId: id => set({ currentMinutesId: id }),
    meetingMinutesUpdateSeq: 0,
    notifyMeetingMinutesUpdated: () =>
      set(state => ({
        meetingMinutesUpdateSeq: state.meetingMinutesUpdateSeq + 1,
      })),
    minutesGenerationNoticeSeq: 0,
    notifyMinutesGenerationRequested: () =>
      set(state => ({
        minutesGenerationNoticeSeq: state.minutesGenerationNoticeSeq + 1,
      })),

    isExitModalOpen: false,
    exitModalCallback: null,
    openExitModal: callback =>
      set({ isExitModalOpen: true, exitModalCallback: callback }),
    closeExitModal: () =>
      set({ isExitModalOpen: false, exitModalCallback: null }),
  })),
);
