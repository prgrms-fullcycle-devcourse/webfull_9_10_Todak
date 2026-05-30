import * as PIXI from 'pixi.js';

export const MEETING_ROOMS_CONFIG = [
  {
    id: 'room_A',
    name: '프라이빗 회의실 A',
    bounds: new PIXI.Rectangle(200, 380, 400, 400),
    color: 0x666666,
  },
  {
    id: 'room_B',
    name: '프라이빗 회의실 B',
    bounds: new PIXI.Rectangle(1950, 450, 350, 350),
    color: 0x666666,
  },
];

export function createMeetingRoom(): PIXI.Container {
  const mainContainer = new PIXI.Container();

  MEETING_ROOMS_CONFIG.forEach(room => {
    const roomContainer = new PIXI.Container();

    // 바닥 타일 그래픽 그리기
    const graphics = new PIXI.Graphics();

    graphics
      .roundRect(
        room.bounds.x,
        room.bounds.y,
        room.bounds.width,
        room.bounds.height,
        16,
      )
      .fill({ color: room.color, alpha: 0.15 });

    roomContainer.addChild(graphics);
    mainContainer.addChild(roomContainer);
  });

  return mainContainer;
}
