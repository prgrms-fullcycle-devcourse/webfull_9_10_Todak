import * as PIXI from 'pixi.js';
import type { AnimalAssetPack } from '../_animals/types';
import { CHAR_WIDTH, CHAR_HEIGHT } from './createPlayer';
import { RoomProfile } from '@/sevice/rooms/api';

export interface RemotePlayer {
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  statusText: PIXI.Text;
  nameText: PIXI.Text;
  textures: AnimalAssetPack;
  baseScaleX: number;
  updatePosition: (newX: number, newY: number) => void;
  updateStatus: (hangulStatus: string, color: number) => void;
}

export function createOtherPlayer(
  textures: AnimalAssetPack,
  member: RoomProfile,
): RemotePlayer {
  const container = new PIXI.Container();
  container.x = member.pos_x ?? 1365;
  container.y = member.pos_y ?? 380;

  // 스프라이트 세팅
  const sprite = new PIXI.Sprite(textures.front);
  sprite.anchor.set(0.5);
  sprite.width = CHAR_WIDTH;
  sprite.height = CHAR_HEIGHT;
  container.addChild(sprite);

  // 텍스처 스왑 시 방향 유지하기 위한 값
  const baseScaleX = sprite.scale.x;

  // 스스로 방향을 계산하고 모습을 바꾸는 함수
  const updatePosition = (newX: number, newY: number) => {
    const dx = newX - container.x;
    const dy = newY - container.y;
    const walkFrame = Math.floor(Date.now() / 150) % 2;

    if (Math.abs(dx) > Math.abs(dy)) {
      sprite.texture = textures.walk[walkFrame];
      sprite.scale.x = dx < 0 ? baseScaleX : -baseScaleX;
    } else if (Math.abs(dy) > Math.abs(dx)) {
      sprite.texture = dy < 0 ? textures.back : textures.front;
      sprite.scale.x = baseScaleX;
    }

    sprite.height = CHAR_HEIGHT;
    container.x = newX;
    container.y = newY;
  };

  // 상태 텍스트와 색상을 바꾸는 함수
  const updateStatus = (hangulStatus: string, color: number) => {
    statusText.text = hangulStatus;
    statusText.style.fill = color;
  };

  // 상태 텍스트
  const statusText = new PIXI.Text({
    text: member.status || '🔥 집중',
    style: { fontSize: 20, fontWeight: 'bold' },
  });
  statusText.anchor.set(0.5);
  statusText.y = -70;
  container.addChild(statusText);

  // 닉네임 텍스트
  const nameText = new PIXI.Text({
    text: member.nickname ?? '로딩 중...',
    style: { fontSize: 20, fill: 0x475569, fontWeight: 'bold' },
  });
  nameText.anchor.set(0.5);
  nameText.y = 70;
  container.addChild(nameText);

  return {
    container,
    sprite,
    statusText,
    nameText,
    textures,
    baseScaleX,
    updatePosition,
    updateStatus,
  };
}
