import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PrivateRoom, RoomProfile } from '../services/rooms/model';

export type AnimalType = 'cat' | 'dog' | 'rabbit' | 'bear' | 'hamster';
export type ViewType = '2d' | 'meeting';

export interface CharacterInfo {
  id: string;
  name: string;
  githubUsername: string;
  avatarId: AnimalType;
  status: string;
  roles: string[];
  detailedRole: string;
}

interface SpaceState {
  myChar: CharacterInfo;
  currentAnimal: AnimalType;
  setMyChar: (info: Partial<CharacterInfo>) => void;
  currentView: ViewType;
  isSidebarOpen: boolean;
  isMenuOpen: boolean;
  menuPos: { x: number; y: number };

  // 상태 변경 액션
  setMyStatus: (status: string) => void;
  setCurrentAnimal: (animal: AnimalType) => void;
  setCurrentView: (view: ViewType) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMenuOpen: (open: boolean) => void;
  setMenuPos: (x: number, y: number) => void;

  // 캐릭터 모달 상태
  isCharacterModalOpen: boolean;
  selectedMember: RoomProfile | CharacterInfo | null;
  openCharacterModal: (member: RoomProfile | CharacterInfo) => void;
  closeCharacterModal: () => void;

  // 프라이빗 룸 전역 상태
  privateRooms: PrivateRoom[];
  setPrivateRooms: (rooms: PrivateRoom[]) => void;
  currentPrivateRoomId: string | null;
  setCurrentPrivateRoomId: (roomId: string | null) => void;

  // 룸 맴버 상태와 액션
  members: RoomProfile[];
  setMembers: (members: RoomProfile[]) => void;
}

export const useSpaceStore = create<SpaceState>()(
  subscribeWithSelector(set => ({
    myChar: {
      id: '',
      githubUsername: '',
      name: '로딩 중...',
      avatarId: 'rabbit',
      status: '🔥 집중',
      roles: ['frontend'],
      detailedRole: 'Frontend Developer',
    },
    currentAnimal: 'rabbit',
    setMyChar: info =>
      set(state => {
        const updatedChar = { ...state.myChar, ...info };
        return { myChar: updatedChar, currentAnimal: updatedChar.avatarId };
      }),
    currentView: '2d',
    isSidebarOpen: true,
    isMenuOpen: false,
    menuPos: { x: 0, y: 0 },

    isCharacterModalOpen: false,
    selectedMember: null,
    openCharacterModal: member =>
      set({ isCharacterModalOpen: true, selectedMember: member }),
    closeCharacterModal: () =>
      set({ isCharacterModalOpen: false, selectedMember: null }),

    setMyStatus: status =>
      set(state => ({ myChar: { ...state.myChar, status } })),
    setCurrentAnimal: animal => set({ currentAnimal: animal }), //  <- 상태 반영
    setCurrentView: view => set({ currentView: view }),
    setSidebarOpen: open => set({ isSidebarOpen: open }),
    toggleSidebar: () =>
      set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
    setMenuOpen: open => set({ isMenuOpen: open }),
    setMenuPos: (x, y) => set({ menuPos: { x, y } }),

    // 프라이빗 룸 상태 초기값과 업데이트 액션
    privateRooms: [],
    setPrivateRooms: rooms => set({ privateRooms: rooms }),
    currentPrivateRoomId: null,
    setCurrentPrivateRoomId: roomId => set({ currentPrivateRoomId: roomId }),

    // 룸 맴버 상태 초기값과 업데이트 액션
    members: [],
    setMembers: members => set({ members }),
  })),
);
