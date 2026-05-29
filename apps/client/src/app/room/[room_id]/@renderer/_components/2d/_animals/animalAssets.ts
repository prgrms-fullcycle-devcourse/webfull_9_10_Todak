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
  dog: {
    front: '/assets/dog_front.png',
    back: '/assets/dog_back.png',
    walk: ['/assets/dog_side_left.png', '/assets/dog_side_right.png'],
  },
  cat: {
    front: '/assets/cat_front.png',
    back: '/assets/cat_back.png',
    walk: ['/assets/cat_side_left.png', '/assets/cat_side_right.png'],
  },
  bear: {
    front: '/assets/bear_front.png',
    back: '/assets/bear_back.png',
    walk: ['/assets/bear_side_left.png', '/assets/bear_side_right.png'],
  },
  hamster: {
    front: '/assets/hamster_front.png',
    back: '/assets/hamster_back.png',
    walk: ['/assets/hamster_side_left.png', '/assets/hamster_side_right.png'],
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
