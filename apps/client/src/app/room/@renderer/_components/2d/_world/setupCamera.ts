import * as PIXI from 'pixi.js';

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
  world.pivot.set(0, 0);

  const MAP_WIDTH = 2455;
  const MAP_HEIGHT = 1170;

  const updateCamera = () => {
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;
    const zoom = world.scale.x;

    let camX = screenWidth / 2 - target.container.x * zoom;
    let camY = screenHeight / 2 - target.container.y * zoom;

    const renderedWidth = MAP_WIDTH * zoom;
    const renderedHeight = MAP_HEIGHT * zoom;

    // 좌우 경계선 클램핑
    if (renderedWidth > screenWidth) {
      const minX = screenWidth - renderedWidth;
      camX = Math.max(minX, Math.min(0, camX));
    } else {
      camX = (screenWidth - renderedWidth) / 2;
    }

    // 상하 경계선 클램핑
    if (renderedHeight > screenHeight) {
      const minY = screenHeight - renderedHeight;
      camY = Math.max(minY, Math.min(0, camY));
    } else {
      camY = (screenHeight - renderedHeight) / 2;
    }

    // 최종 화면 좌표
    world.x = camX;
    world.y = camY;
  };

  app.ticker.add(updateCamera);

  return () => {
    app.ticker.remove(updateCamera);
  };
}
