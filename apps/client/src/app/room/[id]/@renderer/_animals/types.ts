import * as PIXI from 'pixi.js';

export type AnimalType = 'rabbit' | 'dog' | 'cat' | 'bear' | 'hamster';

export interface AnimalAssetPack {
  front: PIXI.Texture;
  back: PIXI.Texture;
  walk: PIXI.Texture[];
}
