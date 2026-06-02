import * as PIXI from 'pixi.js';

export function createMeetingRoom(): PIXI.Container {
  const mainContainer = new PIXI.Container();
  const ROOMS_CONFIG = window.DYNAMIC_ROOMS_CONFIG || [];

  if (ROOMS_CONFIG.length === 0) {
    console.error(
      '[경고] ROOMS_CONFIG가 비어있어서 회의실 영역을 그릴 수 없습니다!',
    );
  }

  ROOMS_CONFIG.forEach(room => {
    const roomContainer = new PIXI.Container();

    const graphics = new PIXI.Graphics();
    graphics
      .roundRect(
        room.bounds.x,
        room.bounds.y,
        room.bounds.width,
        room.bounds.height,
        16,
      )
      .fill({ color: 0xffffff, alpha: 0.1 })
      .stroke({ color: 0xcbd5e1, width: 2, alpha: 0.8 });

    roomContainer.addChild(graphics);

    // '회의 중' 상태 표시
    if (room.isActive) {
      const badge = new PIXI.Graphics();
      badge
        .roundRect(room.bounds.x + 20, room.bounds.y - 30, 80, 24, 12)
        .fill({ color: 0xff4d4f, alpha: 1 });

      // 'ON AIR' 텍스트 설정
      const text = new PIXI.Text({
        text: 'ON AIR',
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });

      // 텍스트 위치를 뱃지 중앙에 대략적으로 맞춤
      text.x = room.bounds.x + 38;
      text.y = room.bounds.y - 25;

      roomContainer.addChild(badge);
      roomContainer.addChild(text);
    }

    mainContainer.addChild(roomContainer);
  });

  return mainContainer;
}
