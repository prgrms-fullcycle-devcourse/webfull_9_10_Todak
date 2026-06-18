import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PrivateRoom, RoomProfile } from '../services/rooms/model';

export type AnimalType = 'cat' | 'dog' | 'rabbit' | 'bear' | 'hamster';

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

  // 상태 변경 액션
  setMyStatus: (status: string) => void;
  setCurrentAnimal: (animal: AnimalType) => void;

  // 프라이빗 룸 전역 상태
  privateRooms: PrivateRoom[];
  setPrivateRooms: (rooms: PrivateRoom[]) => void;
  currentPrivateRoomId: string | null;
  setCurrentPrivateRoomId: (roomId: string | null) => void;

  // 룸 맴버 상태와 액션
  members: RoomProfile[];
  setMembers: (members: RoomProfile[]) => void;

  // 프라이빗룸 진행중인 회의 id
  currentMeetingId: string | null;
  setCurrentMeetingId: (id: string | null) => void;

  // 내 캐릭터 위치 기억용
  lastPosition: { x: number; y: number } | null;
  setLastPosition: (x: number, y: number) => void;
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

    setMyStatus: status =>
      set(state => ({ myChar: { ...state.myChar, status } })),
    setCurrentAnimal: animal => set({ currentAnimal: animal }), //  <- 상태 반영

    // 프라이빗 룸 상태 초기값과 업데이트 액션
    privateRooms: [],
    setPrivateRooms: rooms => set({ privateRooms: rooms }),
    currentPrivateRoomId: null,
    setCurrentPrivateRoomId: roomId => set({ currentPrivateRoomId: roomId }),

    // 룸 맴버 상태 초기값과 업데이트 액션
    members: [],
    setMembers: members => set({ members }),

    // 프라이빗룸 회의 초기값 추가
    currentMeetingId: null,
    setCurrentMeetingId: id => set({ currentMeetingId: id }),

    // 캐릭터 스폰 장소 및 초기값
    lastPosition: null,
    setLastPosition: (x, y) => set({ lastPosition: { x, y } }),
  })),
);
