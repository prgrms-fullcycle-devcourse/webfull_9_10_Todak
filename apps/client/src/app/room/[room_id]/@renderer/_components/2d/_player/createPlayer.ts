import * as PIXI from 'pixi.js';
import { useSpaceStore } from '@/store/useSpaceStore';
import type { AnimalAssetPack } from '../_animals/types';

export const CHAR_WIDTH = 50;
export const CHAR_HEIGHT = 66;

export interface Player {
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  baseScaleX: number;
  baseScaleY: number;
  statusText: PIXI.Text;
  nameText: PIXI.Text;
}

const STATUS_OPTIONS = [
  { label: '🔥 집중', color: 0xffedd5, textColor: 0xea580c },
  { label: '☕ 휴식', color: 0xdcfce7, textColor: 0x16a34a },
  { label: '💬 회의중', color: 0xdbeafe, textColor: 0x2563eb },
  { label: '💤 부재', color: 0xf1f5f9, textColor: 0x475569 },
];

export function createPlayer(
  app: PIXI.Application,
  textures: AnimalAssetPack,
): Player {
  const container = new PIXI.Container();
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;

  // 플레이어 스프라이트 생성
  const sprite = new PIXI.Sprite(textures.front);
  sprite.anchor.set(0.5);
  sprite.width = CHAR_WIDTH;
  sprite.height = CHAR_HEIGHT;
  const baseScaleX = sprite.scale.x;
  const baseScaleY = sprite.scale.y;
  container.addChild(sprite);

  const getStatusColor = (status: string) => {
    if (status.includes('집중')) return 0xea580c;
    if (status.includes('휴식')) return 0x16a34a;
    if (status.includes('회의')) return 0x2563eb;
    if (status.includes('부재')) return 0x475569;
    return 0x64748b;
  };

  // 상태 텍스트
  const { myChar } = useSpaceStore.getState();

  const statusText = new PIXI.Text({
    text: myChar.status,
    style: {
      fontSize: 14,
      fill: getStatusColor(myChar.status),
      fontWeight: 'bold',
    },
  });
  statusText.anchor.set(0.5);
  statusText.y = -45;
  container.addChild(statusText);

  useSpaceStore.subscribe(
    state => state.myChar.status,
    newStatus => {
      statusText.text = newStatus;
      statusText.style.fill = getStatusColor(newStatus);
    },
  );

  // 닉네임
  const nameText = new PIXI.Text({
    text: myChar.name,
    style: { fontSize: 16, fill: 0x1e293b, fontWeight: 'bold' },
  });
  nameText.anchor.set(0.5);
  nameText.y = 45;
  container.addChild(nameText);

  const bubbleContainer = new PIXI.Container();
  bubbleContainer.y = -75;
  bubbleContainer.visible = false;
  container.addChild(bubbleContainer);

  let isExpanded = false;

  // 작은 트리거 버튼 ("💬 상태")
  const triggerBtn = new PIXI.Container();
  triggerBtn.eventMode = 'static';
  triggerBtn.cursor = 'pointer';

  const triggerBg = new PIXI.Graphics();
  triggerBg.roundRect(-30, -12, 60, 24, 12);
  triggerBg.fill({ color: 0xffffff, alpha: 0.95 });
  triggerBg.stroke({ color: 0xe2e8f0, width: 1 });

  const triggerText = new PIXI.Text({
    text: '💬 상태',
    style: { fontSize: 11, fill: 0x475569, fontWeight: 'bold' },
  });
  triggerText.anchor.set(0.5);

  triggerBtn.addChild(triggerBg, triggerText);
  bubbleContainer.addChild(triggerBtn);

  // 확장 메뉴
  const expandedMenu = new PIXI.Container();
  expandedMenu.visible = false;
  bubbleContainer.addChild(expandedMenu);

  const BUTTON_WIDTH = 55;
  const SPACING = 6;
  const TOTAL_WIDTH = BUTTON_WIDTH * 4 + SPACING * 3;
  const START_X = -(TOTAL_WIDTH / 2) + BUTTON_WIDTH / 2;

  STATUS_OPTIONS.forEach((option, index) => {
    const btn = new PIXI.Container();
    btn.x = START_X + index * (BUTTON_WIDTH + SPACING);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.roundRect(-BUTTON_WIDTH / 2, -12, BUTTON_WIDTH, 24, 12);
    bg.fill({ color: option.color, alpha: 0.95 });
    bg.stroke({ color: 0xe2e8f0, width: 1 });

    const text = new PIXI.Text({
      text: option.label,
      style: { fontSize: 10, fill: option.textColor, fontWeight: 'bold' },
    });
    text.anchor.set(0.5);

    btn.addChild(bg, text);
    expandedMenu.addChild(btn);

    // 개별 상태 버튼 클릭 시 이벤트
    btn.on('pointerdown', e => {
      e.stopPropagation();
      useSpaceStore.getState().setMyStatus(option.label);

      isExpanded = false;
      triggerBtn.visible = true;
      expandedMenu.visible = false;
      bubbleContainer.visible = false;
    });
  });

  // 좁은 영역: 토끼 본체 + 작은 말풍선 크기
  const defaultHitArea = new PIXI.Rectangle(-35, -90, 70, 150);
  // 넓은 영역: 양옆으로 펼쳐진 4개의 버튼을 모두 덮을 수 있는 크기
  const expandedHitArea = new PIXI.Rectangle(-130, -90, 260, 150);

  // 마우스 이동할 때 호버가 풀리지 않도록 HitArea 확장
  container.eventMode = 'static';
  container.cursor = 'pointer';
  container.hitArea = defaultHitArea;

  // 캐릭터 위로 마우스가 올라오면 작은 트리거 표시
  container.on('pointerover', () => {
    bubbleContainer.visible = true;
  });

  container.on('pointerout', () => {
    if (!isExpanded) {
      bubbleContainer.visible = false;
    }
  });

  // 작은 트리거("💬 상태") 클릭 시 상태 메뉴 열림
  triggerBtn.on('pointerdown', e => {
    e.stopPropagation();
    isExpanded = true;
    triggerBtn.visible = false;
    expandedMenu.visible = true;
    container.hitArea = expandedHitArea;
  });

  // 캐릭터 자체를 클릭했을 때
  container.on('pointerdown', e => {
    e.stopPropagation();

    // (추후 상세 모달 오픈 예정)
    console.log('상세 프로필 모달 오픈!');

    if (isExpanded) {
      isExpanded = false;
      triggerBtn.visible = true;
      expandedMenu.visible = false;
      bubbleContainer.visible = false;
    }
  });

  return { container, sprite, baseScaleX, baseScaleY, statusText, nameText };
}
