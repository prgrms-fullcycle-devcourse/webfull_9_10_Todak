'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useSpaceStore } from '@/store/useSpaceStore';
import { loadAllAnimalAssets } from './_animals/animalAssets';
import { createPlayer, CHAR_WIDTH, CHAR_HEIGHT } from './_player/createPlayer';
import { setupMovement } from './_player/setupMovement';
import { loadBackgroundAsset } from './_background/backgroundAssets';
import { createBackground } from './_background/createBackground';
import { createWorld } from './_world/createWorld';
import { setupCamera } from './_world/setupCamera';

interface CustomWindow extends Window {
  __PIXI_APP__?: PIXI.Application;
  __PIXI_PLAYER__?: PIXI.Container;
}

export default function PixiCanvas() {
  // 캔버스를 마운트할 DOM 컨테이너 참조
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let app: PIXI.Application | null = null;
    let unsubscribeStatus: (() => void) | null = null;
    let unsubscribeAnimal: (() => void) | null = null;
    let cleanupMovement: (() => void) | null = null;
    let cleanupCamera: (() => void) | null = null;
    let handleResize: (() => void) | null = null;

    const initPixi = async () => {
      const container = canvasRef.current;
      if (!container) return;

      const newApp = new PIXI.Application();
      await newApp.init({
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1, // 레티나 대응
        autoDensity: true,
      });

      if (!isMounted) {
        newApp.destroy(true, { children: true, texture: true });
        return;
      }

      app = newApp;

      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        canvasRef.current.appendChild(app.canvas);
      }

      const world = createWorld();
      app.stage.addChild(world);

      (window as CustomWindow).__PIXI_APP__ = app;

      const backgroundTexture = await loadBackgroundAsset();
      const background = createBackground(backgroundTexture);
      world.addChild(background);

      // 동물 에셋 로드 & 현재 선택된 동물 결정
      const animalAssets = await loadAllAnimalAssets();

      const currentType = useSpaceStore.getState().currentAnimal;

      // store에서 동물 변경 시, 변수만 변경하면 ticker 자동 반영
      let activeTextures = animalAssets[currentType] ?? animalAssets.rabbit;

      // 플레이어 생성 (스프라이트 + 이름표 + 상태창 + 클릭 메뉴)
      const player = createPlayer(app, activeTextures);
      world.addChild(player.container);

      (window as CustomWindow).__PIXI_PLAYER__ = player.container;

      // Zustand 구독
      // 상태 텍스트 (예: "💻 개발 중") 변경 시 머리 위 텍스트 업데이트
      unsubscribeStatus = useSpaceStore.subscribe(
        state => state.myChar.status,
        newStatus => {
          player.statusText.text = newStatus;
        },
      );

      // 동물 종류 변경 시 텍스처 스왑
      unsubscribeAnimal = useSpaceStore.subscribe(
        state => state.currentAnimal,
        newAnimal => {
          activeTextures = animalAssets[newAnimal] ?? animalAssets.rabbit;
          player.sprite.texture = activeTextures.front;
          player.sprite.width = CHAR_WIDTH;
          player.sprite.height = CHAR_HEIGHT;
        },
      );

      // 빈 공간 클릭 시 링 메뉴 닫기
      app.stage.eventMode = 'static';
      app.stage.on('pointerdown', () => {
        useSpaceStore.getState().setMenuOpen(false);
      });

      // 이동 로직 셋업
      cleanupMovement = setupMovement(app, player, () => activeTextures);

      // 카메라 셋업
      cleanupCamera = setupCamera(app, world, player);
      handleResize = () => {
        if (!app || !container) return;
        app.renderer.resize(container.clientWidth, container.clientHeight);
      };
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

      // 메모리 누수 방지 위해 리스너 제거
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }

      app?.destroy(true, { children: true, texture: true });
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 h-full w-full">
      <div
        ref={canvasRef}
        className="border-4 border-slate-700 rounded-xl overflow-hidden shadow-2xl w-full h-full"
        style={{
          width: '90vw',
          maxWidth: '1400px',
          height: '70vh',
          maxHeight: '800px',
        }}
      />
      <p className="text-slate-400 text-sm">
        방향키를 눌러 캐릭터를 움직여 보세요!
      </p>
    </div>
  );
}
