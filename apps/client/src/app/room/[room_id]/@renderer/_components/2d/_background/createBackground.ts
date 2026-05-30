import * as PIXI from 'pixi.js';

export const WORLD_WIDTH = 2455;
export const WORLD_HEIGHT = 1170;

export function createBackground(texture: PIXI.Texture): PIXI.Sprite {
  const background = new PIXI.Sprite(texture);

  // 배경 이미지를 월드 크기에 맞춰 늘림
  background.width = WORLD_WIDTH;
  background.height = WORLD_HEIGHT;

  return background;
}
