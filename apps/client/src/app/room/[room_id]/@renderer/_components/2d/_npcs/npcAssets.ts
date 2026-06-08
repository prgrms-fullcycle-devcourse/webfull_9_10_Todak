import * as PIXI from 'pixi.js';

export interface NpcAssetPack {
  front: PIXI.Texture;
  back: PIXI.Texture;
  walk: PIXI.Texture[];
}

export async function loadMascotNpcAssets(): Promise<NpcAssetPack> {
  const front = await PIXI.Assets.load('/assets/npc_front.png');
  const back = await PIXI.Assets.load('/assets/npc_back.png');
  const walk1 = await PIXI.Assets.load('/assets/npc_left.png');
  const walk2 = await PIXI.Assets.load('/assets/npc_right.png');

  return {
    front,
    back,
    walk: [walk1, walk2],
  };
}
