import * as PIXI from 'pixi.js';
import { NpcAssetPack } from './npcAssets';

export interface MascotNpcContainer extends PIXI.Container {
  say: (message: string) => void;
}

export function createMascotNpc(
  textures: NpcAssetPack,
  x: number,
  y: number,
  npcName: string = '🤖 헬퍼 마스코트',
): MascotNpcContainer {
  const container = new PIXI.Container() as MascotNpcContainer;
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

  // 동적 가변형 말풍선 컴포넌트 구조 셋업
  const bubbleContainer = new PIXI.Container();
  bubbleContainer.y = -80;
  bubbleContainer.visible = true;
  container.addChild(bubbleContainer);

  // 말풍선 배경 그래픽 객체
  const bubbleBg = new PIXI.Graphics();
  bubbleContainer.addChild(bubbleBg);

  // 말풍선 내부 텍스트 객체
  const bubbleText = new PIXI.Text({
    text: '',
    style: {
      fontSize: 20,
      fill: 0x1e293b,
      fontWeight: '600',
      wordWrap: true,
      wordWrapWidth: 500,
    },
  });
  bubbleText.anchor.set(0.5);
  bubbleContainer.addChild(bubbleText);

  // 실시간 알림을 외치는 .say() 함수 정의
  container.say = (message: string) => {
    if (!message) {
      bubbleContainer.visible = false;
      return;
    }

    bubbleText.text = message;

    // 텍스트 크기에 맞춰 말풍선 패딩 및 사이즈 동적 계산
    const paddingX = 14;
    const paddingY = 10;
    const width = Math.max(140, bubbleText.width + paddingX * 2);
    const height = bubbleText.height + paddingY * 2;

    bubbleBg.clear();

    // 말풍선 크기 및 모양
    bubbleBg
      .roundRect(-width / 2, -height / 2, width, height, 10)
      .fill({ color: 0xffffff, alpha: 0.95 })
      .stroke({ width: 2, color: 0xe2e8f0 });

    bubbleBg
      .moveTo(-6, height / 2)
      .lineTo(0, height / 2 + 8)
      .lineTo(6, height / 2)
      .fill({ color: 0xffffff })
      .stroke({ width: 2, color: 0xe2e8f0 });

    bubbleText.x = 0;
    bubbleText.y = 0;
    bubbleContainer.visible = true;
  };

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
