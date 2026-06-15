import * as PIXI from 'pixi.js';
import type { AnimalAssetPack } from '../_animals/types';
import { type Player, CHAR_HEIGHT, CHAR_WIDTH } from './createPlayer';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../_background/createBackground';
import {
  enterPrivateRoom,
  leavePrivateRoom,
  updateMemberStatus,
} from '@/services/rooms/api';
import { getSocket } from '@/lib/socket';
import { useSpaceStore } from '@/store/useSpaceStore';

const SPEED = 6;

// 캐릭터 히트박스 비율
const HITBOX_WIDTH_RATIO = 0.6;
const HITBOX_HEIGHT_RATIO = 0.8;

// 설정된 비율에 맞춰 캐릭터의 히트박스 계산
function getPlayerHitbox(x: number, y: number): PIXI.Rectangle {
  const w = CHAR_WIDTH * HITBOX_WIDTH_RATIO;
  const h = CHAR_HEIGHT * HITBOX_HEIGHT_RATIO;

  return new PIXI.Rectangle(x - w / 2, y - h / 2, w, h);
}

// 두 사각형(AABB)이 서로 겹쳤는지 판별
function checkIntersect(r1: PIXI.Rectangle, r2: PIXI.Rectangle): boolean {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.height + r1.y > r2.y
  );
}

// 벽 충돌 스캔
function checkWallCollision(
  targetX: number,
  targetY: number,
  walls: PIXI.Rectangle[],
): boolean {
  const projectedHitbox = getPlayerHitbox(targetX, targetY);
  return walls.some(wall => checkIntersect(projectedHitbox, wall));
}

// 캐릭터 발바닥 히트박스
function getPlayerFeetSensor(x: number, y: number): PIXI.Rectangle {
  const sensorWidth = 16;
  const sensorHeight = 10;

  return new PIXI.Rectangle(
    x - sensorWidth / 2,
    y + (CHAR_HEIGHT * HITBOX_HEIGHT_RATIO) / 2 - sensorHeight,
    sensorWidth,
    sensorHeight,
  );
}

export function setupMovement(
  app: PIXI.Application,
  player: Player,
  getTextures: () => AnimalAssetPack,
  darkOverlay: PIXI.Graphics,
  roomId: string,
  walls: PIXI.Rectangle[],
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

  let currentRoomId: string | null = null;
  let isProcessing = false;

  let lastSentX = player.container.x;
  let lastSentY = player.container.y;

  const ticker = (t: PIXI.Ticker) => {
    const textures = getTextures();
    const { container, sprite, baseScaleX } = player;
    let isMoving = false;
    const walkFrame = Math.floor(Date.now() / 150) % 2;

    const moveStep = SPEED * t.deltaTime;

    const prevX = container.x;
    const prevY = container.y;

    if (keys['ArrowUp']) {
      container.y -= moveStep;
      sprite.texture = textures.back;
      sprite.scale.x = baseScaleX;
      isMoving = true;
    } else if (keys['ArrowDown']) {
      container.y += moveStep;
      sprite.texture = textures.front;
      sprite.scale.x = baseScaleX;
      isMoving = true;
    }
    container.y = Math.max(50, Math.min(1170 - 50, container.y));
    if (checkWallCollision(container.x, container.y, walls)) {
      container.y = prevY;
    }

    if (keys['ArrowLeft']) {
      container.x -= moveStep;
      sprite.texture = textures.walk[walkFrame];
      sprite.scale.x = baseScaleX;
      isMoving = true;
    } else if (keys['ArrowRight']) {
      container.x += moveStep;
      sprite.texture = textures.walk[walkFrame];
      sprite.scale.x = -baseScaleX;
      isMoving = true;
    }
    container.x = Math.max(30, Math.min(2455 - 30, container.x));
    if (checkWallCollision(container.x, container.y, walls)) {
      container.x = prevX;
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
    container.x = Math.max(30, Math.min(2455 - 30, container.x));
    container.y = Math.max(50, Math.min(1170 - 50, container.y));

    if (container.x !== lastSentX || container.y !== lastSentY) {
      getSocket().emit('room:move', {
        roomId: roomId,
        posX: container.x,
        posY: container.y,
      });

      lastSentX = container.x;
      lastSentY = container.y;

      const currentStatus = useSpaceStore.getState().myChar.status;

      if (currentStatus === '💤 부재' || currentStatus === '☕ 휴식') {
        useSpaceStore.getState().setMyStatus('🔥 집중');
        updateMemberStatus(roomId, 'focus').catch(err => {
          console.error('❌ 상태 변경 API 호출 실패:', err);
        });
      }
    }

    // 캐릭터 발바닥 영역 지정
    const playerFeet = getPlayerFeetSensor(container.x, container.y);

    function checkIntersect(r1: PIXI.Rectangle, r2: PIXI.Rectangle) {
      return (
        r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.height + r1.y > r2.y
      );
    }

    const ROOMS_CONFIG = window.DYNAMIC_ROOMS_CONFIG || [];
    const insideRoom = ROOMS_CONFIG.find(room =>
      checkIntersect(playerFeet, room.bounds),
    );

    const newRoomId = insideRoom ? insideRoom.id : null;

    if (newRoomId !== currentRoomId && !isProcessing) {
      // 회의실 입장
      if (currentRoomId === null && newRoomId !== null) {
        if (newRoomId.startsWith('empty-room')) return;
        isProcessing = true;

        enterPrivateRoom(roomId, newRoomId)
          .then(() => {
            getSocket().emit('private-room:enter', {
              roomId: roomId,
              privateRoomId: newRoomId,
            });
            currentRoomId = newRoomId;
            useSpaceStore.getState().setMyStatus('💬 회의중');
            useSpaceStore.getState().setCurrentPrivateRoomId(newRoomId);
            updateMemberStatus(roomId, 'meeting');
          })
          .catch(err => console.error(`입장 실패:`, err))
          .finally(() => {
            isProcessing = false;
          });

        darkOverlay
          .clear()
          .rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
          .fill({ color: 0x111111, alpha: 0.65 })
          .roundRect(
            insideRoom!.bounds.x,
            insideRoom!.bounds.y,
            insideRoom!.bounds.width,
            insideRoom!.bounds.height,
            16,
          )
          .cut();

        darkOverlay.visible = true;
      }

      // 회의실 퇴장
      else if (currentRoomId !== null && newRoomId === null) {
        isProcessing = true;
        const roomToLeave = currentRoomId;
        getSocket().emit('private-room:leave', {
          roomId: roomId,
          privateRoomId: roomToLeave,
        });

        leavePrivateRoom(roomId, roomToLeave)
          .then(() => {
            currentRoomId = null;
            darkOverlay.visible = false;
            useSpaceStore.getState().setCurrentPrivateRoomId(null);
            useSpaceStore.getState().setMyStatus('🔥 집중');
            updateMemberStatus(roomId, 'focus');
          })
          .catch(err => console.error(`HTTP 퇴장 API 실패:`, err))
          .finally(() => {
            isProcessing = false;
          });
      }
    }
  };

  app.ticker.add(ticker);

  // cleanup 함수 반환
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    app.ticker.remove(ticker);
  };
}
