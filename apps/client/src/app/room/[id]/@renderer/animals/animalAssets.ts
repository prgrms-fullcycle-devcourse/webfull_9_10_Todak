import * as PIXI from 'pixi.js';
import type { AnimalType, AnimalAssetPack } from './types';

const ANIMAL_ASSET_PATHS: Record<
  AnimalType,
  {
    front: string;
    back: string;
    walk: [string, string];
  }
> = {
  rabbit: {
    front: '/assets/rabbit_front.png',
    back: '/assets/rabbit_back.png',
    walk: ['/assets/rabbit_side_left.png', '/assets/rabbit_side_right.png'],
  },
};

export async function loadAnimalAsset(
  type: AnimalType,
): Promise<AnimalAssetPack> {
  const paths = ANIMAL_ASSET_PATHS[type];
  const [front, back, walkLeft, walkRight] = await Promise.all([
    PIXI.Assets.load(paths.front),
    PIXI.Assets.load(paths.back),
    PIXI.Assets.load(paths.walk[0]),
    PIXI.Assets.load(paths.walk[1]),
  ]);
  return { front, back, walk: [walkLeft, walkRight] };
}
