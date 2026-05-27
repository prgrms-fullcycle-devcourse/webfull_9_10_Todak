import * as PIXI from 'pixi.js';

const BACKGROUND_ASSET_PATH = '/assets/background.png';

export async function loadBackgroundAsset(): Promise<PIXI.Texture> {
  return PIXI.Assets.load(BACKGROUND_ASSET_PATH);
}
