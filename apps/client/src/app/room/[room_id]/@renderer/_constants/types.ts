import * as PIXI from 'pixi.js';

// 룸 정보 타입 정의
export interface DynamicRoomConfig {
  id: string;
  name: string;
  bounds: PIXI.Rectangle;
  isActive: boolean;
  color: number;
}

// 전역 window 객체 타입 확장
declare global {
  interface Window {
    DYNAMIC_ROOMS_CONFIG?: DynamicRoomConfig[];
  }
}
