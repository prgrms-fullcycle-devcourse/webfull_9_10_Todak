import * as PIXI from 'pixi.js';
import { NpcAssetPack } from './npcAssets';

export function createMascotNpc(
  textures: NpcAssetPack,
  x: number,
  y: number,
  npcName: string = '🤖 헬퍼 마스코트',
) {
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;

  // NPC 스프라이트
  const sprite = new PIXI.Sprite(textures.front);
  sprite.anchor.set(0.5);
  sprite.width = 100;
  sprite.height = 145;
  container.addChild(sprite);

  // NPC 머리 위 닉네임 텍스트 설정
  const nameText = new PIXI.Text({
    text: npcName,
    style: { fontSize: 18, fill: 0x0f172a, fontWeight: 'bold' },
  });
  nameText.anchor.set(0.5);
  nameText.y = 70;
  container.addChild(nameText);

  // NPC 마우스 인터랙션 레이어 잠금 해제
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerdown', e => {
    e.stopPropagation();

    // NPC 클릭 이벤트 및 알림 기능 추가 예정
    alert(`${npcName}: "반갑습니다! 토닥윗미 가상 타운에 오신 것을 환영해요!"`);
  });

  return container;
}
