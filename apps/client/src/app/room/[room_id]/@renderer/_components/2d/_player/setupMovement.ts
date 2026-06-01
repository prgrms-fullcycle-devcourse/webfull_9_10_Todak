import * as PIXI from 'pixi.js';
import type { AnimalAssetPack } from '../_animals/types';
import { type Player, CHAR_HEIGHT } from './createPlayer';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../_background/createBackground';
import { enterPrivateRoom, leavePrivateRoom } from '@/sevice/rooms/api';
import { getSocket } from '@/lib/socket';

const SPEED = 6;

export function setupMovement(
  app: PIXI.Application,
  player: Player,
  getTextures: () => AnimalAssetPack,
  darkOverlay: PIXI.Graphics,
  roomId: string,
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

  const ticker = () => {
    const textures = getTextures();
    const { container, sprite, baseScaleX } = player;
    let isMoving = false;
    const walkFrame = Math.floor(Date.now() / 150) % 2;

    if (keys['ArrowUp']) {
      container.y -= SPEED;
      sprite.texture = textures.back;
      sprite.scale.x = baseScaleX;
      isMoving = true;
    } else if (keys['ArrowDown']) {
      container.y += SPEED;
      sprite.texture = textures.front;
      sprite.scale.x = baseScaleX;
      isMoving = true;
    }

    if (keys['ArrowLeft']) {
      container.x -= SPEED;
      sprite.texture = textures.walk[walkFrame];
      sprite.scale.x = baseScaleX;
      isMoving = true;
    } else if (keys['ArrowRight']) {
      container.x += SPEED;
      sprite.texture = textures.walk[walkFrame];
      sprite.scale.x = -baseScaleX;
      isMoving = true;
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

    // 캐릭터 현재 좌표
    const playerX = player.container.x;
    const playerY = player.container.y;

    const playerHitbox = new PIXI.Rectangle(playerX - 15, playerY - 30, 30, 50);

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
      checkIntersect(playerHitbox, room.bounds),
    );

    const newRoomId = insideRoom ? insideRoom.id : null;

    if (newRoomId !== currentRoomId && !isProcessing) {
      // 회의실 입장
      if (currentRoomId === null && newRoomId !== null) {
        isProcessing = true;
        console.log(`[API 호출] ${insideRoom?.name} 입장 요청 중...`);

        enterPrivateRoom(roomId, newRoomId)
          .then(() => {
            getSocket().emit('private-room:enter', {
              roomId: roomId,
              privateRoomId: newRoomId,
            });
          })
          .catch(err => console.error(`입장 실패:`, err))
          .finally(() => {
            isProcessing = false;
          });

        darkOverlay.clear();
        darkOverlay
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
        leavePrivateRoom(roomId, currentRoomId)
          .then(() => {
            getSocket().emit('private-room:leave', {
              roomId: roomId,
              privateRoomId: currentRoomId,
            });
          })
          .catch(err => console.error(`퇴장 실패:`, err))
          .finally(() => {
            isProcessing = false;
          });

        darkOverlay.visible = false;
      }

      currentRoomId = newRoomId;
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
