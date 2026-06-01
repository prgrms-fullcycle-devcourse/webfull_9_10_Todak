import * as PIXI from 'pixi.js';
import { useSpaceStore } from '@/store/useSpaceStore';
import type { AnimalAssetPack } from '../_animals/types';
import { updateMemberStatus } from '@/sevice/rooms/api';
import { MemberStatus } from '@/sevice/rooms/model';

export const CHAR_WIDTH = 90;
export const CHAR_HEIGHT = 120;

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

const LABEL_TO_STATUS_MAP: Record<string, MemberStatus> = {
  '🔥 집중': 'focus',
  '☕ 휴식': 'rest',
  '💬 회의중': 'meeting',
  '💤 부재': 'away',
};

export function createPlayer(
  app: PIXI.Application,
  textures: AnimalAssetPack,
  roomId: string,
): Player {
  const container = new PIXI.Container();
  container.x = 1365;
  container.y = 380;
  container.eventMode = 'static';

  // 플레이어 스프라이트 생성
  const sprite = new PIXI.Sprite(textures.front);
  sprite.anchor.set(0.5);
  sprite.width = CHAR_WIDTH;
  sprite.height = CHAR_HEIGHT;
  sprite.eventMode = 'static';
  sprite.cursor = 'pointer';
  container.addChild(sprite);

  const baseScaleX = sprite.scale.x;
  const baseScaleY = sprite.scale.y;

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
      fontSize: 20,
      fill: getStatusColor(myChar.status),
      fontWeight: 'bold',
    },
  });
  statusText.anchor.set(0.5);
  statusText.y = -70;
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
    style: { fontSize: 20, fill: 0x1e293b, fontWeight: 'bold' },
  });
  nameText.anchor.set(0.5);
  nameText.y = 70;
  container.addChild(nameText);

  const bubbleContainer = new PIXI.Container();
  bubbleContainer.y = -80;
  bubbleContainer.visible = false;
  container.addChild(bubbleContainer);

  let isExpanded = false;

  // 작은 트리거 버튼 ("💬 상태")
  const triggerBtn = new PIXI.Container();
  triggerBtn.eventMode = 'static';
  triggerBtn.cursor = 'pointer';
  triggerBtn.y = -35;

  const triggerBg = new PIXI.Graphics();
  triggerBg.roundRect(-55, -22, 110, 44, 22);
  triggerBg.fill({ color: 0xffffff, alpha: 0.95 });
  triggerBg.stroke({ color: 0xe2e8f0, width: 1 });

  const triggerText = new PIXI.Text({
    text: '💬 상태',
    style: { fontSize: 18, fill: 0x475569, fontWeight: 'bold' },
  });
  triggerText.anchor.set(0.5);

  const triggerBridge = new PIXI.Graphics();
  triggerBridge.rect(-55, 22, 110, 40);
  triggerBridge.fill({ color: 0xffffff, alpha: 0.001 });

  triggerBtn.addChild(triggerBg, triggerText, triggerBridge);
  bubbleContainer.addChild(triggerBtn);

  // 확장 메뉴
  const expandedMenu = new PIXI.Container();
  expandedMenu.y = -35;
  expandedMenu.visible = false;
  bubbleContainer.addChild(expandedMenu);

  const BUTTON_WIDTH = 110;
  const SPACING = 12;
  const TOTAL_WIDTH = BUTTON_WIDTH * 4 + SPACING * 3;
  const START_X = -(TOTAL_WIDTH / 2) + BUTTON_WIDTH / 2;

  const hoverBridge = new PIXI.Graphics();
  hoverBridge.rect(-250, -30, 500, 150);
  hoverBridge.fill({ color: 0xffffff, alpha: 0.001 });
  expandedMenu.addChild(hoverBridge);

  STATUS_OPTIONS.forEach((option, index) => {
    const btn = new PIXI.Container();
    btn.x = START_X + index * (BUTTON_WIDTH + SPACING);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.roundRect(-BUTTON_WIDTH / 2, -22, BUTTON_WIDTH, 44, 22);
    bg.fill({ color: option.color, alpha: 0.95 });
    bg.stroke({ color: 0xe2e8f0, width: 1 });

    const text = new PIXI.Text({
      text: option.label,
      style: { fontSize: 18, fill: option.textColor, fontWeight: 'bold' },
    });
    text.anchor.set(0.5);

    btn.addChild(bg, text);
    expandedMenu.addChild(btn);

    btn.on('pointerdown', async e => {
      e.stopPropagation();
      useSpaceStore.getState().setMyStatus(option.label);

      const apiStatus = LABEL_TO_STATUS_MAP[option.label];
      if (apiStatus) {
        try {
          await updateMemberStatus(roomId, apiStatus);
        } catch (err) {
          console.error('상태 변경 API 반영 실패:', err);
        }
      }

      isExpanded = false;
      triggerBtn.visible = true;
      expandedMenu.visible = false;
      bubbleContainer.visible = false;
    });
  });

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

  app.stage.eventMode = 'static';
  app.stage.on('pointerdown', () => {
    if (isExpanded) {
      isExpanded = false;
      triggerBtn.visible = true;
      expandedMenu.visible = false;
      bubbleContainer.visible = false;
    }
  });

  return { container, sprite, baseScaleX, baseScaleY, statusText, nameText };
}
