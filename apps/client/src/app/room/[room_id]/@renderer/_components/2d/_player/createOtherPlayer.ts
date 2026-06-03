import * as PIXI from 'pixi.js';
import type { AnimalAssetPack } from '../_animals/types';
import { CHAR_WIDTH, CHAR_HEIGHT } from './createPlayer';
import { RoomProfile } from '@/sevice/rooms/api';

export interface RemotePlayer {
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  statusText: PIXI.Text;
  nameText: PIXI.Text;
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

  // 상태 텍스트
  const statusText = new PIXI.Text({
    text: member.status || '🔥 집중',
    style: { fontSize: 20, fill: 0xea580c, fontWeight: 'bold' },
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

  return { container, sprite, statusText, nameText };
}
