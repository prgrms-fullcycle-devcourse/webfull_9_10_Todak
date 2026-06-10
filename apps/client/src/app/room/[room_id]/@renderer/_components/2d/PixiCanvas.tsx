'use client';
import { useEffect, useRef } from 'react';
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
import { getSocket } from '@/lib/socket';
import {
  fetchRoomMembers,
  RoomMembers,
  RoomProfile,
} from '@/services/rooms/api';
import { useQueryClient } from '@tanstack/react-query';
import { loadMascotNpcAssets } from '../2d/_npcs/npcAssets';
import { createMascotNpc } from '../2d/_npcs/createNpc';

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

export default function PixiCanvas({ roomId }: PixiCanvasProps) {
  // 캔버스를 마운트할 DOM 컨테이너 참조
  const canvasRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    let app: PIXI.Application | null = null;
    let unsubscribeStatus: (() => void) | null = null;
    let unsubscribeAnimal: (() => void) | null = null;
    let unsubscribePlayer: (() => void) | null = null;
    let unsubscribeModal: (() => void) | null = null;
    let cleanupMovement: (() => void) | null = null;
    let cleanupCamera: (() => void) | null = null;
    let handleResize: (() => void) | null = null;

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
      world.sortableChildren = true; // zIndex 기반 정렬 활성화
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

      // 동물 에셋 로드 & 현재 선택된 동물 결정
      const animalAssets = await loadAllAnimalAssets();
      const currentType = useSpaceStore.getState().currentAnimal;

      // store에서 동물 변경 시, 변수만 변경하면 ticker 자동 반영
      let activeTextures = animalAssets[currentType] ?? animalAssets.rabbit;

      const mascotTextures = await loadMascotNpcAssets();

      // NPC 배치 생성
      const helperNpc = createMascotNpc(mascotTextures, 1500, 500, '토닥이');
      helperNpc.zIndex = 8;
      world.addChild(helperNpc);

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

      // 캐릭터 내부 좀비 리스너 구독
      unsubscribePlayer = player.unsubscribePlayerStatus;
      (window as CustomWindow).__PIXI_PLAYER__ = player.container;

      // 룸 내 팀원 렌더링
      const remotePlayers = new Map<string, RemotePlayer>();
      const { myChar } = useSpaceStore.getState();
      const syncMembers = (currentMembers: RoomProfile[]) => {
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
          if (member.id === myChar.id) return;

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

      const socket = getSocket();

      socket.emit('room:join', { roomId });

      socket.on(
        'room:user-joined',
        (data: { userId: string; login: string; avatarUrl: string }) => {
          console.log(
            '👋 [입장 감지] 새로운 팀원이 맵에 접속했습니다. 패킷 정보:',
            data,
          );

          setTimeout(async () => {
            const freshData = await fetchRoomMembers(roomId);
            if (freshData && freshData.members) {
              queryClient.setQueryData<RoomMembers>(
                ['room-members', roomId],
                freshData,
              );
              useSpaceStore.getState().setMembers(freshData.members);
              syncMembers(freshData.members);
            }
          }, 200);
        },
      );

      // 맴버 소켓 이벤트 수신
      socket.on(
        'room:member-moved',
        (data: { userId: string; posX: number; posY: number }) => {
          const targetPlayer = remotePlayers.get(data.userId);
          if (targetPlayer) {
            targetPlayer.updatePosition(data.posX, data.posY);
          } else {
            fetchRoomMembers(roomId).then(res => {
              if (res?.members) {
                useSpaceStore.getState().setMembers(res.members);
              }
            });
          }
        },
      );

      // 다른 유저 상태 변경 소켓 리스너
      socket.on(
        'room:member-status-changed',
        (data: { userId: string; status: string }) => {
          const targetPlayer = remotePlayers.get(data.userId);
          if (targetPlayer) {
            const hangulStatus =
              STATUS_TO_LABEL_MAP[data.status] || data.status;
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
        },
      );

      socket.on(
        'room:member-profile-changed',
        (data: {
          userId: string;
          nickname: string | null;
          character_type: string | null;
          roles: string[];
          detailed_role: string | null;
        }) => {
          console.log(
            '🚨 [소켓 감지] room:member-profile-changed 이벤트 신호가 정상 도달했습니다!',
          );
          console.log(
            '📦 백엔드 서버가 실시간으로 배달해준 원본 패킷 데이터(data):',
            data,
          );

          console.log(
            '⏱️ DB 동기화 정착을 위해 안전망 타이머 0.2초(200ms) 가동을 시작합니다.',
          );

          setTimeout(async () => {
            const store = useSpaceStore.getState();
            console.log(
              '⏱️ 0.2초 대기 마감. 백엔드 최신 멤버 목록 HTTP API(fetchRoomMembers)를 찌릅니다.',
            );

            // 1️⃣ 최신 명부 수신
            const freshRoomData = await fetchRoomMembers(roomId);

            if (!freshRoomData) {
              console.error(
                '❌ [에러] 최신 멤버 목록 API 응답 객체가 통째로 비어있습니다 (freshRoomData가 비정상)',
              );
              return;
            }
            if (!freshRoomData.members) {
              console.error(
                '❌ [에러] freshRoomData는 왔으나 내부 members 배열이 존재하지 않습니다:',
                freshRoomData,
              );
              return;
            }

            // 📢 STEP 2: 서버 DB가 돌려준 진짜 오피셜 데이터 상태를 감시합니다.
            console.log(
              '📡 [API 응답 성공] 현재 서버 데이터베이스(DB)에 최종 저장되어 있는 회원 목록:',
              freshRoomData.members,
            );

            // 이번에 소켓을 보낸 그 유저가 API 결과물 속에 어떤 상태(닉네임, 동물)로 박혀있는지 핀포인트 검증
            const updatedUserInApi = freshRoomData.members.find(
              m => String(m.id) === String(data.userId),
            );
            console.log(
              `🔍 [정밀 매칭 검증] 프로필을 바꾼 유저(ID: ${data.userId})의 현재 서버 DB 저장 상태:`,
              updatedUserInApi,
            );

            // 2️⃣ 기존 화면의 그래픽 명부 청소 가동
            console.log(
              '🧹 [캔버스 청소 작업 시작] 현재 2D 맵 화면에 그려져 서 있는 원격 유저 ID들:',
              Array.from(remotePlayers.keys()),
            );

            for (const [userId, remotePlayer] of remotePlayers.entries()) {
              console.log(
                `  -> 🧼 화면에서 원격 캐릭터 제거 중: ID = ${userId}`,
              );
              world.removeChild(remotePlayer.container);
              remotePlayer.container.destroy({ children: true });
            }
            remotePlayers.clear();
            console.log(
              '✅ [청소 완료] 2D 맵 위의 모든 원격 캐릭터 그래픽 찌꺼기가 도화지에서 사라졌습니다.',
            );

            // 3️⃣ 리액트 쿼리 캐시 및 Zustand 명부 스왑
            console.log(
              '💾 React Query 캐시 구조와 Zustand 전역 명부(members)를 갓 받아온 최신 데이터로 일제히 스왑합니다.',
            );
            queryClient.setQueryData<RoomMembers>(
              ['room-members', roomId],
              freshRoomData,
            );
            store.setMembers(freshRoomData.members);

            // 4️⃣ 변경 주체 분기 처리 감시
            const isMe = String(data.userId) === String(store.myChar.id);
            console.log(
              `👤 [주체 판정] 프로필을 변경한 주인공은 누구인가요? ➡️ ${isMe ? '나 자신(A)입니다.' : '다른 팀원(B)입니다.'}`,
            );

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
                console.log(
                  '✅ 나 자신의 캐릭터 전역 스토어(myChar) 및 머리 위 이름표 최종 갱신 완료:',
                  store.myChar,
                );
              }
            } else {
              // 5️⃣ 원격 플레이어 리렌더링 가동 감시
              console.log(
                '🎨 [리렌더링 가동] 깨끗해진 도화지에 최신 API 명부를 주입하여 팀원들을 새로 그립니다. (syncMembers 호출)',
              );
              syncMembers(freshRoomData.members);
              console.log(
                '🎨 [리렌더링 마감] syncMembers 함수 작동 후 최종 복구된 화면 속 원격 명부:',
                Array.from(remotePlayers.keys()),
              );
            }

            console.log(
              '================= 실시간 동기화 파이프라인 흐름 종료 =================',
            );
          }, 200);
        },
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

      // 이동 로직 셋업
      cleanupMovement = setupMovement(
        app,
        player,
        () => activeTextures,
        darkOverlay,
        roomId,
      );

      // 카메라 셋업
      cleanupCamera = setupCamera(app, world, player);

      // 리사이즈 로직 고도화
      handleResize = () => {
        if (!app || !app.renderer || !container) return;

        const w = container.clientWidth;
        const h = container.clientHeight;
        app.renderer.resize(w, h);

        // 배경 이미지 캔버스에 여백 없이 꽉 차도록 'Cover' 배율 계산
        const scaleX = w / WORLD_WIDTH;
        const scaleY = h / WORLD_HEIGHT;
        // 두 배율 중 더 큰 값을 선택해야 빈 여백 없이 화면에 꽉 찹니다.
        const dynamicScale = Math.max(scaleX, scaleY);

        // 월드 전체에 동적 배율 적용 (의자와 캐릭터의 상대적 비율이 모든 해상도에서 유지됨)
        world.scale.set(dynamicScale);
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

      // 맴버 소켓 이벤트 리스너 제거
      getSocket().off('room:user-joined');
      getSocket().off('room:member-moved');
      getSocket().off('room:member-status-changed');
      getSocket().off('room:member-profile-changed');

      // 리사이즈 이벤트 리스너 제거
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (app) {
        app.destroy(true, { children: true, texture: false });
      }
    };
  }, [roomId, queryClient]);

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
    </div>
  );
}
