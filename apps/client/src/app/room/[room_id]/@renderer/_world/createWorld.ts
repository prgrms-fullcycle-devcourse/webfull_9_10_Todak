import * as PIXI from 'pixi.js';

/**
 * 월드 컨테이너 생성.
 * 이 컨테이너의 위치를 옮기면 화면에 보이는 영역이 바뀜 (= 카메라 효과).
 */
export function createWorld(): PIXI.Container {
  return new PIXI.Container();
}
