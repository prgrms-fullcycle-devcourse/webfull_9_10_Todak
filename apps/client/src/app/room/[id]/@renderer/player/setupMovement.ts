import * as PIXI from 'pixi.js';
import type { AnimalAssetPack } from '../animals/types';
import { type Player, CHAR_HEIGHT } from './createPlayer';

const SPEED = 5;

export function setupMovement(
  app: PIXI.Application,
  player: Player,
  getTextures: () => AnimalAssetPack,
): () => void {
  const keys: Record<string, boolean> = {};
  const handleKeyDown = (e: KeyboardEvent) => {
    keys[e.key] = true;
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    keys[e.key] = false;
  };
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  const tickerCallback = () => {
    const textures = getTextures();
    const { container, sprite, baseScaleX } = player;
    let isMoving = false;
    const walkFrame = Math.floor(Date.now() / 150) % 2;

    if (keys['ArrowUp']) {
      container.y -= SPEED;
      sprite.texture = textures.back;
      sprite.scale.x = baseScaleX;
      isMoving = true;
    } else if (keys['ArrowDown']) {
      container.y += SPEED;
      sprite.texture = textures.front;
      sprite.scale.x = baseScaleX;
      isMoving = true;
    }

    if (keys['ArrowLeft']) {
      container.x -= SPEED;
      sprite.texture = textures.walk[walkFrame];
      sprite.scale.x = baseScaleX;
      isMoving = true;
    } else if (keys['ArrowRight']) {
      container.x += SPEED;
      sprite.texture = textures.walk[walkFrame];
      sprite.scale.x = -baseScaleX;
      isMoving = true;
    }

    if (isMoving) {
      sprite.y = Math.sin(Date.now() * 0.02) * 2;
    } else {
      sprite.y = 0;
      if (sprite.texture === textures.walk[1]) {
        sprite.texture = textures.walk[0];
      }
    }

    // 캐릭터 크기 고정
    sprite.height = CHAR_HEIGHT;

    // 화면 경계 처리
    container.x = Math.max(30, Math.min(app.screen.width - 30, container.x));
    container.y = Math.max(50, Math.min(app.screen.height - 50, container.y));
  };

  app.ticker.add(tickerCallback);

  // cleanup 함수 반환
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    app.ticker.remove(tickerCallback);
  };
}
