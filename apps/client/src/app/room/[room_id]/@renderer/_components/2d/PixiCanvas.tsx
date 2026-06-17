'use client';
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { AnimalType, useSpaceStore } from '@/store/useSpaceStore';
import { loadAllAnimalAssets } from './_animals/animalAssets';
import {
  createPlayer,
  CHAR_WIDTH,
  CHAR_HEIGHT,
  getStatusColor,
} from './_player/createPlayer';
import { setupMovement } from './_player/setupMovement';
import { loadBackgroundAsset } from './_background/backgroundAssets';
import {
  createBackground,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './_background/createBackground';
import { createWorld } from './_world/createWorld';
import { setupCamera } from './_world/setupCamera';
import { createMeetingRoom } from '../meeting/_world/createMeetingRoom';
import { createOtherPlayer, RemotePlayer } from './_player/createOtherPlayer';
import { useSocket } from '@/providers/SocketProvider';
import {
  fetchRoomMembers,
  RoomMembers,
  RoomProfile,
} from '@/services/rooms/api';
import { useQueryClient } from '@tanstack/react-query';
import { loadMascotNpcAssets } from '../2d/_npcs/npcAssets';
import { createMascotNpc, MascotNpcContainer } from '../2d/_npcs/createNpc';
import { useNotifications } from '@/services/notifications/query';
import NotificationHistoryModal from './NotificationHistoryModal';
import { openChatSafely } from '../../../@chats/_components/ChatOpenButton';
import rawWallData from '@/app/room/[room_id]/@renderer/_constants/walls.json';

interface CustomWindow extends Window {
  __PIXI_APP__?: PIXI.Application;
  __PIXI_PLAYER__?: PIXI.Container;
}

interface PixiCanvasProps {
  roomId: string;
}

const STATUS_TO_LABEL_MAP: Record<string, string> = {
  focus: '🔥 집중',
  rest: '☕ 휴식',
  meeting: '💬 회의중',
  away: '💤 부재',
};

interface MeetingLabelContainer extends PIXI.Container {
  redraw: (isMeetingActive: boolean) => void;
}

interface WallDataConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export default function PixiCanvas({ roomId }: PixiCanvasProps) {
  // 캔버스를 마운트할 DOM 컨테이너 참조
  const canvasRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const npcRef = useRef<MascotNpcContainer | null>(null);
  const [isNpcReady, setIsNpcReady] = useState(false);
  const { data: notificationData } = useNotifications(roomId);
  const npcTimeoutRef = useRef<number | null>(null);
  const prevNotificationIdRef = useRef<string | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const notifications = notificationData?.notifications ?? [];

  useEffect(() => {
    let isMounted = true;
    let app: PIXI.Application | null = null;
    let unsubscribeStatus: (() => void) | null = null;
    let unsubscribeAnimal: (() => void) | null = null;
    let unsubscribePlayer: (() => void) | null = null;
    let unsubscribeModal: (() => void) | null = null;
    let unsubscribeMeetingId: (() => void) | null = null;
    let unsubscribeRoomsList: (() => void) | null = null;
    let cleanupMovement: (() => void) | null = null;
    let cleanupCamera: (() => void) | null = null;
    let handleResize: (() => void) | null = null;
    let localPlayerContainer: PIXI.Container | null = null;
    let resizeAnimationFrameId: number | null = null; // 애니메이션 프레임 ID를 기억할 로컬 변수
    // 이 effect 가 등록한 소켓 리스너 해제 함수 모음 (자기 핸들러만 off)
    const socketOffs: Array<() => void> = [];

    const initPixi = async () => {
      const container = canvasRef.current;
      if (!container) return;

      PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';

      const roomData = await fetchRoomMembers(roomId);

      if (roomData && roomData.members) {
        useSpaceStore.getState().setMembers(roomData.members);

        // 유저 id 기준 내 프로필 탐색
        const myId = useSpaceStore.getState().myChar.id;
        const myFreshRoomProfile = roomData.members.find(m => m.id === myId);

        if (myFreshRoomProfile) {
          // Zustand 초기화 및 현재 룸에 있는 정보 동기화
          useSpaceStore.getState().setMyChar({
            id: myFreshRoomProfile.id,
            name: myFreshRoomProfile.nickname ?? '미지정',
            avatarId: myFreshRoomProfile.character_type as AnimalType,
            status:
              STATUS_TO_LABEL_MAP[myFreshRoomProfile.status] ||
              myFreshRoomProfile.status ||
              '🔥 집중',
            roles: myFreshRoomProfile.roles ?? ['frontend'],
            detailedRole: myFreshRoomProfile.detailed_role ?? 'Team Member',
          });
        }
      }

      const newApp = new PIXI.Application();
      await newApp.init({
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1, // 레티나 대응
        autoDensity: true,
        antialias: false,
      });

      if (!isMounted) {
        newApp.destroy(true, { children: true, texture: true });
        return;
      }

      app = newApp;
      app.ticker.maxFPS = 60;

      app.canvas.style.imageRendering = 'pixelated';

      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        canvasRef.current.appendChild(app.canvas);
      }

      const world = createWorld();
      world.sortableChildren = true;
      app.stage.addChild(world);
      (window as CustomWindow).__PIXI_APP__ = app;

      // 배경 세팅
      const backgroundTexture = await loadBackgroundAsset();
      const background = createBackground(backgroundTexture);
      background.zIndex = 0;
      world.addChild(background);

      // 회의실 영역
      const meetingRoom = createMeetingRoom();
      meetingRoom.zIndex = 1;
      world.addChild(meetingRoom);

      const meetingRoomsConfig = [
        { defaultName: '회의실 A', x: 300, y: 350 },
        { defaultName: '회의실 B', x: 2050, y: 420 },
      ];

      const labelContainers: MeetingLabelContainer[] = [];

      meetingRoomsConfig.forEach((config, index) => {
        const labelContainer = new PIXI.Container() as MeetingLabelContainer;
        labelContainer.x = config.x;
        labelContainer.y = config.y;
        labelContainer.zIndex = 7;
        world.addChild(labelContainer);

        const labelBg = new PIXI.Graphics();
        labelContainer.addChild(labelBg);

        const labelText = new PIXI.Text({
          text: '',
          style: { fontSize: 13, fontWeight: 'bold', fontFamily: 'Arial' },
        });
        labelText.anchor.set(0.5);
        labelContainer.addChild(labelText);

        labelContainer.redraw = (isMeetingActive: boolean) => {
          labelBg.clear();
          const actualRoomData = useSpaceStore.getState().privateRooms[index];
          const roomName = actualRoomData?.name || config.defaultName;

          if (isMeetingActive) {
            labelText.text = `🔴 ${roomName} (회의중)`;
            labelText.style.fill = 0xffffff;
            labelBg
              .roundRect(-85, -16, 170, 32, 8)
              .fill({ color: 0xef4444, alpha: 0.95 })
              .stroke({ width: 2, color: 0xfca5a5 });
          } else {
            labelText.text = `👥 ${roomName}`;
            labelText.style.fill = 0x475569;
            labelBg
              .roundRect(-85, -16, 170, 32, 8)
              .fill({ color: 0xf1f5f9, alpha: 0.9 })
              .stroke({ width: 2, color: 0xcbd5e1 });
          }
        };

        labelContainers.push(labelContainer);
      });

      // 회의실 상태 라벨 활성화 여부 및 업데이트
      const refreshAllMeetingLabels = () => {
        const state = useSpaceStore.getState();

        labelContainers.forEach((container, index) => {
          const targetRoom = state.privateRooms[index];
          let isRoomMeetingActive = false;

          if (targetRoom) {
            // 내가 이 방에 들어가 있고, 실시간 회의 ID 장부가 활성화
            if (
              state.currentPrivateRoomId === targetRoom.id &&
              state.currentMeetingId !== null
            ) {
              isRoomMeetingActive = true;
            }
            // 소켓 동기화
            else if (
              Object.prototype.hasOwnProperty.call(
                targetRoom,
                'is_meeting_active',
              )
            ) {
              const safeRoomRecord = targetRoom as unknown as Record<
                string,
                unknown
              >;
              if (safeRoomRecord.is_meeting_active === true) {
                isRoomMeetingActive = true;
              }
            }
          }

          container.redraw(isRoomMeetingActive);
        });
      };

      refreshAllMeetingLabels();

      // 스토어의 회의 상태 변화율을 정밀 실시간 감시
      unsubscribeMeetingId = useSpaceStore.subscribe(
        state => state.currentMeetingId,
        () => refreshAllMeetingLabels(),
      );

      unsubscribeRoomsList = useSpaceStore.subscribe(
        state => state.privateRooms,
        () => refreshAllMeetingLabels(),
      );

      // 동물 에셋 로드 & 현재 선택된 동물 결정
      const animalAssets = await loadAllAnimalAssets();
      const currentType = useSpaceStore.getState().currentAnimal;

      // store에서 동물 변경 시, 변수만 변경하면 ticker 자동 반영
      let activeTextures = animalAssets[currentType] ?? animalAssets.rabbit;

      const mascotTextures = await loadMascotNpcAssets();

      // NPC 배치 생성
      const helperNpc = createMascotNpc(
        mascotTextures,
        1500,
        500,
        '토닥이',
        () => {
          setIsNotificationModalOpen(true);
        },
      );
      helperNpc.zIndex = 8;
      world.addChild(helperNpc);
      npcRef.current = helperNpc;
      setIsNpcReady(true);

      // 회의실 입장 시 화면을 어둡게 하는 오버레이
      const darkOverlay = new PIXI.Graphics();
      darkOverlay.zIndex = 5;
      darkOverlay.visible = false;
      darkOverlay.eventMode = 'none';
      world.addChild(darkOverlay);

      // 플레이어 생성 (스프라이트 + 이름표 + 상태창 + 클릭 메뉴)
      const player = createPlayer(app, activeTextures, roomId);
      player.container.zIndex = 10;
      world.addChild(player.container);

      // 플레이어 생성 직후 스토어에 과거 저장 좌표가 있다면 강제 복원 스냅
      const savedPosition = useSpaceStore.getState().lastPosition;
      if (savedPosition) {
        player.container.x = savedPosition.x;
        player.container.y = savedPosition.y;
      }
      localPlayerContainer = player.container;

      // 캐릭터 내부 좀비 리스너 구독
      unsubscribePlayer = player.unsubscribePlayerStatus;
      (window as CustomWindow).__PIXI_PLAYER__ = player.container;

      // 룸 내 팀원 렌더링
      const remotePlayers = new Map<string, RemotePlayer>();
      const syncMembers = (currentMembers: RoomProfile[]) => {
        const currentMyId = useSpaceStore.getState().myChar.id;

        // 나간 사람 캔버스에서 제거
        const currentMemberIds = new Set(currentMembers.map(m => m.id));
        for (const [userId, remotePlayer] of remotePlayers.entries()) {
          if (!currentMemberIds.has(userId)) {
            world.removeChild(remotePlayer.container);
            remotePlayer.container.destroy({ children: true });
            remotePlayers.delete(userId);
          }
        }

        // 새로 들어온 사람 캔버스에 추가
        currentMembers.forEach(member => {
          if (String(member.id) === String(currentMyId)) return;

          if (!remotePlayers.has(member.id)) {
            const memberTextures =
              animalAssets[member.character_type as AnimalType] ??
              animalAssets.rabbit;
            const remotePlayer = createOtherPlayer(memberTextures, member);

            const initialHangulStatus =
              STATUS_TO_LABEL_MAP[member.status] || member.status || '🔥 집중';
            remotePlayer.statusText.text = initialHangulStatus;
            remotePlayer.statusText.style.fill =
              getStatusColor(initialHangulStatus);
            remotePlayer.container.zIndex = 9;

            world.addChild(remotePlayer.container);
            remotePlayers.set(member.id, remotePlayer);
          }
        });

        world.sortChildren();
      };
      syncMembers(useSpaceStore.getState().members);

      const handleUserJoined = () => {
        setTimeout(async () => {
          const store = useSpaceStore.getState();

          const freshRoomData = await fetchRoomMembers(roomId);
          if (!freshRoomData || !freshRoomData.members) return;
          for (const remotePlayer of remotePlayers.values()) {
            world.removeChild(remotePlayer.container);
            remotePlayer.container.destroy({ children: true });
          }
          remotePlayers.clear();

          queryClient.setQueryData<RoomMembers>(
            ['room-members', roomId],
            freshRoomData,
          );
          store.setMembers(freshRoomData.members);
          const myId = store.myChar.id;
          const myFreshProfile = freshRoomData.members.find(m => m.id === myId);
          if (myFreshProfile && player) {
            player.nameText.text = myFreshProfile.nickname ?? '미지정';

            store.setMyChar({
              id: myFreshProfile.id,
              name: myFreshProfile.nickname ?? '미지정',
              avatarId: myFreshProfile.character_type as AnimalType,
              status:
                STATUS_TO_LABEL_MAP[myFreshProfile.status] ||
                myFreshProfile.status ||
                '🔥 집중',
              roles: myFreshProfile.roles ?? ['frontend'],
              detailedRole: myFreshProfile.detailed_role ?? 'Team Member',
            });
          }

          syncMembers(freshRoomData.members);
        }, 200);
      };
      socket.on('room:user-joined', handleUserJoined);
      socketOffs.push(() => socket.off('room:user-joined', handleUserJoined));

      // 맴버 소켓 이벤트 수신
      const handleMemberMoved = (data: {
        userId: string;
        posX: number;
        posY: number;
      }) => {
        const targetPlayer = remotePlayers.get(data.userId);
        if (targetPlayer) {
          targetPlayer.updatePosition(data.posX, data.posY);
        } else {
          fetchRoomMembers(roomId).then(res => {
            if (res?.members) {
              useSpaceStore.getState().setMembers(res.members);
              syncMembers(res.members);
            }
          });
        }
      };
      socket.on('room:member-moved', handleMemberMoved);
      socketOffs.push(() => socket.off('room:member-moved', handleMemberMoved));

      // 다른 유저 상태 변경 소켓 리스너
      const handleMemberStatusChanged = (data: {
        userId: string;
        status: string;
      }) => {
        const targetPlayer = remotePlayers.get(data.userId);
        if (targetPlayer) {
          const hangulStatus = STATUS_TO_LABEL_MAP[data.status] || data.status;
          const color = getStatusColor(hangulStatus);
          targetPlayer.updateStatus(hangulStatus, color);
        }

        queryClient.setQueryData<RoomMembers>(
          ['room-members', roomId],
          oldData => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              members: oldData.members.map(m =>
                String(m.id) === String(data.userId)
                  ? { ...m, status: data.status }
                  : m,
              ),
            };
          },
        );
        const updatedMembers = useSpaceStore
          .getState()
          .members.map(m =>
            String(m.id) === String(data.userId)
              ? { ...m, status: data.status }
              : m,
          );
        useSpaceStore.getState().setMembers(updatedMembers);

        // 현재 열려있는 모달창의 유저 정보 실시간 갱신
        const currentSelected = useSpaceStore.getState().selectedMember;
        if (
          currentSelected &&
          String(currentSelected.id) === String(data.userId)
        ) {
          useSpaceStore.getState().openCharacterModal({
            ...currentSelected,
            status: data.status,
          });
        }
      };
      socket.on('room:member-status-changed', handleMemberStatusChanged);
      socketOffs.push(() =>
        socket.off('room:member-status-changed', handleMemberStatusChanged),
      );

      const handleMemberProfileChanged = (data: {
        userId: string;
        nickname: string | null;
        character_type: string | null;
        roles: string[];
        detailed_role: string | null;
      }) => {
        setTimeout(async () => {
          const store = useSpaceStore.getState();

          // 최신 목록 수신 및 안전망 검증
          const freshRoomData = await fetchRoomMembers(roomId);
          if (!freshRoomData || !freshRoomData.members) return;

          // 기존 화면의 그래픽 제거
          for (const remotePlayer of remotePlayers.values()) {
            world.removeChild(remotePlayer.container);
            remotePlayer.container.destroy({ children: true });
          }
          remotePlayers.clear();

          // React Query 캐시 및 Zustand 명부 일제히 업데이트
          queryClient.setQueryData<RoomMembers>(
            ['room-members', roomId],
            freshRoomData,
          );
          store.setMembers(freshRoomData.members);

          // 변경 주체가 '나'인지 '타인'인지 판별 후 처리
          const isMe = String(data.userId) === String(store.myChar.id);

          if (isMe) {
            const myFreshProfile = freshRoomData.members.find(
              m => String(m.id) === String(data.userId),
            );
            if (myFreshProfile && player) {
              const normalizedNickname =
                myFreshProfile.nickname ?? String(data.nickname);
              player.nameText.text = normalizedNickname;

              store.setMyChar({
                id: myFreshProfile.id,
                name: normalizedNickname,
                avatarId: myFreshProfile.character_type as AnimalType,
                status:
                  STATUS_TO_LABEL_MAP[myFreshProfile.status] ||
                  myFreshProfile.status ||
                  '🔥 집중',
                roles: myFreshProfile.roles ?? ['frontend'],
                detailedRole: myFreshProfile.detailed_role ?? 'Team Member',
              });
            }
          }
          syncMembers(freshRoomData.members);
        }, 200);
      };
      socket.on('room:member-profile-changed', handleMemberProfileChanged);
      socketOffs.push(() =>
        socket.off('room:member-profile-changed', handleMemberProfileChanged),
      );

      unsubscribeStatus = useSpaceStore.subscribe(
        state => state.myChar.status,
        newStatus => {
          player.statusText.text = newStatus;
        },
      );

      // 동물 종류 변경 시 텍스처 스왑
      unsubscribeAnimal = useSpaceStore.subscribe(
        state => state.myChar.avatarId,
        newAnimal => {
          activeTextures = animalAssets[newAnimal] ?? animalAssets.rabbit;
          player.sprite.texture = activeTextures.front;
          player.sprite.width = CHAR_WIDTH;
          player.sprite.height = CHAR_HEIGHT;
        },
      );

      // 상세 모달 오픈 시, pixi 그래픽 일시정지
      unsubscribeModal = useSpaceStore.subscribe(
        state => state.isCharacterModalOpen,
        isOpen => {
          if (!newApp) return;
          if (isOpen) {
            newApp.stop();
          } else {
            newApp.start();
          }
        },
      );

      // 빈 공간 클릭 시 링 메뉴 닫기
      app.stage.eventMode = 'static';
      app.stage.on('pointerdown', () => {
        useSpaceStore.getState().setMenuOpen(false);
      });

      // 이동 제한 구역 데이터
      const staticOfficeWalls: PIXI.Rectangle[] = (
        rawWallData as WallDataConfig[]
      ).map(
        wall => new PIXI.Rectangle(wall.x, wall.y, wall.width, wall.height),
      );

      // 이동 로직 셋업
      cleanupMovement = setupMovement(
        app,
        player,
        () => activeTextures,
        darkOverlay,
        roomId,
        staticOfficeWalls,
        socket,
      );

      // 카메라 셋업
      cleanupCamera = setupCamera(app, world, player);

      // 리사이즈 로직 고도화
      handleResize = () => {
        if (!app || !app.renderer || !container) return;

        const currentApp = app;

        if (resizeAnimationFrameId !== null) {
          cancelAnimationFrame(resizeAnimationFrameId);
        }

        resizeAnimationFrameId = requestAnimationFrame(() => {
          const w = container.clientWidth;
          const h = container.clientHeight;

          currentApp.renderer.resize(w, h);

          const scaleX = w / WORLD_WIDTH;
          const scaleY = h / WORLD_HEIGHT;
          const dynamicScale = Math.max(scaleX, scaleY);

          world.scale.set(dynamicScale);

          currentApp.render();
        });
      };

      handleResize();
      window.addEventListener('resize', handleResize);
    };

    initPixi();

    // 컴포넌트 언마운트 시 호출
    return () => {
      isMounted = false;
      cleanupCamera?.();
      cleanupMovement?.();
      unsubscribeStatus?.();
      unsubscribeAnimal?.();
      unsubscribePlayer?.();
      unsubscribeModal?.();
      unsubscribeMeetingId?.();
      unsubscribeRoomsList?.();
      unsubscribeRoomsList?.();
      npcRef.current = null;
      setIsNpcReady(false);

      // 클린업 순간 남아있는 애니메이션 스케줄링 제거
      if (resizeAnimationFrameId !== null) {
        cancelAnimationFrame(resizeAnimationFrameId);
      }

      if (localPlayerContainer) {
        useSpaceStore
          .getState()
          .setLastPosition(localPlayerContainer.x, localPlayerContainer.y);
      }

      npcRef.current = null;
      setIsNpcReady(false);

      // 맴버 소켓 이벤트 리스너 제거 (이 effect 가 등록한 핸들러만)
      socketOffs.forEach(off => off());

      // 리사이즈 이벤트 리스너 제거
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (app) {
        app.destroy(true, { children: true, texture: false });
      }
      if (npcTimeoutRef.current) {
        window.clearTimeout(npcTimeoutRef.current);
      }
    };
  }, [roomId, queryClient, socket]);

  // 실시간 알림 연동
  useEffect(() => {
    if (!isNpcReady || !npcRef.current) return;

    const notifications = notificationData?.notifications ?? [];
    if (notifications.length === 0) {
      if (prevNotificationIdRef.current === null) {
        npcRef.current.say('토닥윗미에 오신 것을 환영합니다! 🚀');
        npcTimeoutRef.current = window.setTimeout(() => {
          npcRef.current?.say('');
        }, 5000);
        // ID가 없더라도 null이 아닌 상태로 만들어 중복 방지
        prevNotificationIdRef.current = 'welcome-done';
      }
      return;
    }

    const latestNotification = notifications[0];

    if (prevNotificationIdRef.current === null) {
      prevNotificationIdRef.current = latestNotification.id;

      npcRef.current.say('토닥윗미에 오신 것을 환영합니다! 🚀');

      if (npcTimeoutRef.current) window.clearTimeout(npcTimeoutRef.current);
      npcTimeoutRef.current = window.setTimeout(() => {
        if (npcRef.current) {
          npcRef.current.say('');
        }
        npcTimeoutRef.current = null;
      }, 5000);

      return;
    }

    // 실시간 새 알림 적재 발생 시
    if (
      !latestNotification.is_sample &&
      latestNotification.id !== prevNotificationIdRef.current
    ) {
      if (prevNotificationIdRef.current === null) {
        prevNotificationIdRef.current = latestNotification.id;
        return;
      }
      prevNotificationIdRef.current = latestNotification.id;

      if (npcRef.current) {
        if (npcTimeoutRef.current) {
          window.clearTimeout(npcTimeoutRef.current);
        }

        const formattedMessage = `${latestNotification.message}`;

        // NPC 말풍선
        npcRef.current.say(formattedMessage);
        npcTimeoutRef.current = window.setTimeout(() => {
          if (npcRef.current) {
            npcRef.current.say('');
          }
          npcTimeoutRef.current = null;
        }, 5000);
      }
    }
  }, [notificationData, isNpcReady, roomId]);

  // 회의실 채팅방 자동 열람
  useEffect(() => {
    const unsubscribePrivateRoom = useSpaceStore.subscribe(
      state => state.currentPrivateRoomId,
      currentRoomId => {
        if (currentRoomId !== null) {
          const store = useSpaceStore.getState();

          openChatSafely();

          store.setActiveChatTab('private');
        }
      },
    );

    return () => {
      unsubscribePrivateRoom();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-start gap-2 pt-0 h-full w-full">
      <div
        ref={canvasRef}
        className="border-4 border-slate-700 rounded-xl overflow-hidden w-full h-full mt-0"
        style={{
          width: '60vw',
          maxWidth: '1400px',
          height: '60vh',
          maxHeight: '800px',
          aspectRatio: '2455 / 1170',
        }}
      />
      <p className="text-slate-400 text-sm mt-2 mb-4">
        방향키를 눌러 캐릭터를 움직여 보세요!
      </p>
      <NotificationHistoryModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        roomId={roomId}
      />
    </div>
  );
}
