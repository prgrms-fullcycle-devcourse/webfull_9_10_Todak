import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type AnimalType = 'cat' | 'dog' | 'rabbit' | 'bear' | 'hamster';

interface SpaceState {
  myChar: { name: string; status: string };
  currentAnimal: AnimalType;
  isMenuOpen: boolean;
  menuPos: { x: number; y: number };

  // 상태 변경 액션
  setMyStatus: (status: string) => void;
  setCurrentAnimal: (animal: AnimalType) => void;
  setMenuOpen: (open: boolean) => void;
  setMenuPos: (x: number, y: number) => void;
}

export const useSpaceStore = create<SpaceState>()(
  subscribeWithSelector(set => ({
    myChar: { name: '토끼', status: '💤' },
    currentAnimal: 'rabbit',
    isMenuOpen: false,
    menuPos: { x: 0, y: 0 },

    setMyStatus: status =>
      set(state => ({ myChar: { ...state.myChar, status } })),
    setCurrentAnimal: animal => set({ currentAnimal: animal }), //  <- 상태 반영
    setMenuOpen: open => set({ isMenuOpen: open }),
    setMenuPos: (x, y) => set({ menuPos: { x, y } }),
  })),
);
