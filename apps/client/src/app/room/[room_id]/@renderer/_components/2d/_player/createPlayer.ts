import * as PIXI from 'pixi.js';
import { useSpaceStore } from '@/store/useSpaceStore';
import type { AnimalAssetPack } from '../_components/2d/_animals/types';

export const CHAR_WIDTH = 50;
export const CHAR_HEIGHT = 66;

export interface Player {
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  baseScaleX: number;
  baseScaleY: number;
  statusText: PIXI.Text;
  nameText: PIXI.Text;
}

export function createPlayer(
  app: PIXI.Application,
  textures: AnimalAssetPack,
): Player {
  const container = new PIXI.Container();
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;

  const sprite = new PIXI.Sprite(textures.front);
  sprite.anchor.set(0.5);
  sprite.width = CHAR_WIDTH;
  sprite.height = CHAR_HEIGHT;
  const baseScaleX = sprite.scale.x;
  const baseScaleY = sprite.scale.y;
  container.addChild(sprite);

  const { myChar } = useSpaceStore.getState();

  const statusText = new PIXI.Text({
    text: myChar.status,
    style: { fontSize: 14, fill: 0x64748b, fontWeight: 'bold' },
  });
  statusText.anchor.set(0.5);
  statusText.y = -45;
  container.addChild(statusText);

  const nameText = new PIXI.Text({
    text: myChar.name,
    style: { fontSize: 16, fill: 0x1e293b, fontWeight: 'bold' },
  });
  nameText.anchor.set(0.5);
  nameText.y = 45;
  container.addChild(nameText);

  // 링 메뉴 클릭
  container.eventMode = 'static';
  container.cursor = 'pointer';
  container.on('pointerdown', e => {
    const globalPos = container.toGlobal(new PIXI.Point(0, 0));
    const store = useSpaceStore.getState();
    store.setMenuPos(globalPos.x, globalPos.y);
    store.setMenuOpen(!store.isMenuOpen);
    e.stopPropagation();
  });

  return { container, sprite, baseScaleX, baseScaleY, statusText, nameText };
}
