import * as PIXI from 'pixi.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../_background/createBackground';

interface CameraTarget {
  container: PIXI.Container;
}

/**
 * 카메라 follow 로직.
 * 매 프레임 worldContainer 위치를 갱신해서
 * target(캐릭터)이 화면 중앙에 보이도록 함.
 * 단, 월드 끝에 가까워지면 카메라가 더 이상 못 따라가도록 클램핑.
 *
 * @returns cleanup 함수 (ticker 해제용)
 */
export function setupCamera(
  app: PIXI.Application,
  world: PIXI.Container,
  target: CameraTarget,
): () => void {
  const updateCamera = () => {
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // 카메라 위치 : 캐릭터가 화면 정중앙에 오도록
    let camX = screenWidth / 2 - target.container.x;
    let camY = screenHeight / 2 - target.container.y;

    // 클램핑: 카메라가 월드 바깥 빈 공간을 보지 않도록
    const minX = Math.min(0, screenWidth - WORLD_WIDTH);
    const minY = Math.min(0, screenHeight - WORLD_HEIGHT);

    camX = Math.max(minX, Math.min(0, camX));
    camY = Math.max(minY, Math.min(0, camY));

    world.x = camX;
    world.y = camY;
  };

  app.ticker.add(updateCamera);

  return () => {
    app.ticker.remove(updateCamera);
  };
}
