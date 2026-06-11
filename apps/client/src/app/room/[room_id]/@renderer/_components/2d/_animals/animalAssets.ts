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
    front: '/assets/rabbit_front.webp',
    back: '/assets/rabbit_back.webp',
    walk: ['/assets/rabbit_side_left.webp', '/assets/rabbit_side_right.webp'],
  },
  dog: {
    front: '/assets/dog_front.webp',
    back: '/assets/dog_back.webp',
    walk: ['/assets/dog_side_left.webp', '/assets/dog_side_right.webp'],
  },
  cat: {
    front: '/assets/cat_front.webp',
    back: '/assets/cat_back.webp',
    walk: ['/assets/cat_side_left.webp', '/assets/cat_side_right.webp'],
  },
  bear: {
    front: '/assets/bear_front.webp',
    back: '/assets/bear_back.webp',
    walk: ['/assets/bear_side_left.webp', '/assets/bear_side_right.webp'],
  },
  hamster: {
    front: '/assets/hamster_front.webp',
    back: '/assets/hamster_back.webp',
    walk: ['/assets/hamster_side_left.webp', '/assets/hamster_side_right.webp'],
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

export async function loadAllAnimalAssets(): Promise<
  Record<AnimalType, AnimalAssetPack>
> {
  const types = Object.keys(ANIMAL_ASSET_PATHS) as AnimalType[];
  const entries = await Promise.all(
    types.map(async type => [type, await loadAnimalAsset(type)] as const),
  );
  return Object.fromEntries(entries) as Record<AnimalType, AnimalAssetPack>;
}
