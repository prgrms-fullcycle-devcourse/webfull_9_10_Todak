'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useSpaceStore } from '@/store/useSpaceStore';
import { loadAnimalAsset } from './animals/animalAssets';
import { createPlayer } from './player/createPlayer';
import { setupMovement } from './player/setupMovement';

export default function PixiCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: PIXI.Application | null = null;
    let unsubscribeStatus: (() => void) | null = null;
    let cleanupMovement: (() => void) | null = null;

    const initPixi = async () => {
      app = new PIXI.Application();
      await app.init({
        width: 1000,
        height: 500,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        canvasRef.current.appendChild(app.canvas);
      }

      const textures = await loadAnimalAsset('rabbit');
      const player = createPlayer(app, textures);
      app.stage.addChild(player.container);

      // 상태 텍스트 구독
      unsubscribeStatus = useSpaceStore.subscribe(
        state => state.myChar.status,
        newStatus => {
          player.statusText.text = newStatus;
        },
      );

      // 빈 공간 클릭 시 메뉴 닫기
      app.stage.eventMode = 'static';
      app.stage.on('pointerdown', () => {
        useSpaceStore.getState().setMenuOpen(false);
      });

      // 이동 로직 설정
      cleanupMovement = setupMovement(app, player, () => textures);
    };

    initPixi();

    return () => {
      cleanupMovement?.();
      unsubscribeStatus?.();
      app?.destroy(true, { children: true, texture: true });
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4">
      <div
        ref={canvasRef}
        className="border-4 border-slate-700 rounded-xl overflow-hidden shadow-2xl"
      />
      <p className="text-slate-400 text-sm">
        방향키를 눌러 캐릭터를 움직여 보세요!
      </p>
    </div>
  );
}
