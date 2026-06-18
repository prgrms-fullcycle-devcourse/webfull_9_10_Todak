import * as PIXI from 'pixi.js';
import type { AnimalAssetPack } from '../_animals/types';
import { type Player, CHAR_HEIGHT, CHAR_WIDTH } from './createPlayer';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../_background/createBackground';
import { enterPrivateRoom, updateMemberStatus } from '@/services/rooms/api';
import type { Socket } from 'socket.io-client';
import { useSpaceStore } from '@/store/useSpaceStore';
import { endMeeting, generateMinutes } from '@/services/minutes/api';

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
  socket: Socket,
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

  let currentRoomId: string | null =
    useSpaceStore.getState().currentPrivateRoomId;
  let isProcessing = false;

  let lastSentX = player.container.x;
  let lastSentY = player.container.y;

  // 전역 스토어의 룸 상태가 변하면 로컬 변수 실시간 싱크업
  const unsubscribeRoomState = useSpaceStore.subscribe(
    state => state.currentPrivateRoomId,
    id => {
      currentRoomId = id;
    },
  );

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
      socket.emit('room:move', {
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
            socket.emit('private-room:enter', {
              roomId: roomId,
              privateRoomId: newRoomId,
            });
            currentRoomId = newRoomId;

            const store = useSpaceStore.getState();
            store.setMyStatus('💬 회의중');
            store.setCurrentPrivateRoomId(newRoomId);
            updateMemberStatus(roomId, 'meeting');

            // 회의 종료된 회의실 입장 시, 잔여 미팅 ID 초기화
            const targetRoom = store.privateRooms.find(r => r.id === newRoomId);
            if (targetRoom && !targetRoom.is_meeting_active) {
              store.setCurrentMeetingId(null);
            }
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

        // ID 타입을 String으로 강제 형변환하여 나 자신을 확실하게 제외
        const myId = useSpaceStore.getState().myChar.id;
        const otherMembersInMeeting = useSpaceStore
          .getState()
          .members.filter(
            m =>
              String(m.id) !== String(myId) &&
              (m.status === 'meeting' || m.status === '💬 회의중'),
          );

        const isLastPerson = otherMembersInMeeting.length === 0;

        // 현재 프라이빗 룸 회의 상태
        const privateRooms = useSpaceStore.getState().privateRooms;
        const currentRoomRecord = privateRooms.find(r => r.id === roomToLeave);

        // 백엔드 명부 장부상 active 또는 내 로컬 미팅 세션 ID가 존재할 때만 회의 중으로 확정
        const isMeetingOngoing =
          currentRoomRecord?.is_meeting_active === true ||
          useSpaceStore.getState().currentMeetingId !== null;

        // 비동기 회의 종료 및 퇴장 프로세스 통합 처리 함수
        const executeLeaveProcedure = async (shouldEndMeeting: boolean) => {
          currentRoomId = null;
          darkOverlay.visible = false;
          useSpaceStore.getState().setCurrentPrivateRoomId(null);
          useSpaceStore.getState().setMyStatus('🔥 집중');

          socket.emit('private-room:leave', {
            roomId: roomId,
            privateRoomId: roomToLeave,
          });

          // 마지막 사람이고 회의 중이라면 선택 여부와 무관하게 회의는 무조건 공식 종료 처리
          if (isLastPerson && isMeetingOngoing) {
            const currentMeetingId = useSpaceStore.getState().currentMeetingId;

            if (currentMeetingId) {
              try {
                // 아니요 클릭한 경우 회의 종료 API 가동
                const endedMeeting = await endMeeting(roomId, currentMeetingId);

                // 모달에서 네를 누른 경우에만 AI 회의록 파이프라인 가동
                if (shouldEndMeeting) {
                  const endedAt = new Date(endedMeeting.ended_at);
                  const minutesTitle = `${endedAt.getFullYear()}.${String(endedAt.getMonth() + 1).padStart(2, '0')}.${String(endedAt.getDate()).padStart(2, '0')} ${String(endedAt.getHours()).padStart(2, '0')}:${String(endedAt.getMinutes()).padStart(2, '0')} 회의록`;

                  useSpaceStore.getState().notifyMinutesGenerationRequested();
                  void generateMinutes(
                    roomId,
                    currentMeetingId,
                    minutesTitle,
                  ).catch(error => {
                    console.error('❌ AI 회의록 생성 요청 실패:', error);
                  });
                }

                // 회의 세션 ID 청소는 공통 적용
                useSpaceStore.getState().setCurrentMeetingId(null);
              } catch (apiError) {
                console.error('❌ 퇴장 중 회의 자동 종료 처리 실패:', apiError);
              }
            }
          }

          updateMemberStatus(roomId, 'focus')
            .catch(err => console.error('❌ 상태 DB 원복 실패:', err))
            .finally(() => {
              isProcessing = false;
            });
        };

        // 마지막 퇴장자이면서 "실제로 회의가 진행 중일 때만" 팝업 호출
        if (isLastPerson && isMeetingOngoing) {
          Object.keys(keys).forEach(key => {
            keys[key] = false;
          });

          // zustand 스토어를 통한 리액트 모달 오픈
          useSpaceStore.getState().openExitModal(confirmEnd => {
            executeLeaveProcedure(confirmEnd);
          });
        } else {
          executeLeaveProcedure(false);
        }
      }
    }
  };

  app.ticker.add(ticker);

  // cleanup 함수 반환
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    app.ticker.remove(ticker);
    unsubscribeRoomState();
  };
}
