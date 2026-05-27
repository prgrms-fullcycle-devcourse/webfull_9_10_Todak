import * as PIXI from 'pixi.js';

export type AnimalType = 'rabbit';

export interface AnimalAssetPack {
  front: PIXI.Texture;
  back: PIXI.Texture;
  walk: PIXI.Texture[];
}
