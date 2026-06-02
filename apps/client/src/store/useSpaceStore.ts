import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PrivateRoom } from '../sevice/rooms/model';

export type AnimalType = 'cat' | 'dog' | 'rabbit' | 'bear' | 'hamster';
export type ViewType = '2d' | 'meeting';

interface SpaceState {
  myChar: { id: string; name: string; status: string };
  currentAnimal: AnimalType;
  currentView: ViewType;
  isMenuOpen: boolean;
  menuPos: { x: number; y: number };

  // 상태 변경 액션
  setMyStatus: (status: string) => void;
  setCurrentAnimal: (animal: AnimalType) => void;
  setCurrentView: (view: ViewType) => void;
  setMenuOpen: (open: boolean) => void;
  setMenuPos: (x: number, y: number) => void;

  // 프라이빗 룸 전역 상태
  privateRooms: PrivateRoom[];
  setPrivateRooms: (rooms: PrivateRoom[]) => void;
}

export const useSpaceStore = create<SpaceState>()(
  subscribeWithSelector(set => ({
    myChar: { id: 'user-uuid-1234', name: '토끼', status: '🔥 집중' },
    currentAnimal: 'rabbit',
    currentView: '2d',
    isMenuOpen: false,
    menuPos: { x: 0, y: 0 },

    setMyStatus: status =>
      set(state => ({ myChar: { ...state.myChar, status } })),
    setCurrentAnimal: animal => set({ currentAnimal: animal }), //  <- 상태 반영
    setCurrentView: view => set({ currentView: view }),
    setMenuOpen: open => set({ isMenuOpen: open }),
    setMenuPos: (x, y) => set({ menuPos: { x, y } }),

    // 프라이빗 룸 상태 초기값과 업데이트 액션
    privateRooms: [],
    setPrivateRooms: rooms => set({ privateRooms: rooms }),
  })),
);
