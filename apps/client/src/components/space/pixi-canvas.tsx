'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export default function PixiCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: PIXI.Application;

    const initPixi = async () => {
      app = new PIXI.Application();

      await app.init({
        width: 500,
        height: 500,
        backgroundColor: 0x1e293b,
        resolution: window.devicePixelRatio || 1, // 레티나 디스플레이 대응
        autoDensity: true,
      });

      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        canvasRef.current.appendChild(app.canvas);
      }

      // 고양이 캐릭터 에셋 로드
      const textures = {
        front: await PIXI.Assets.load('/assets/cat_front.png'),
        back: await PIXI.Assets.load('/assets/cat_back.png'),
        side: await PIXI.Assets.load('/assets/cat_side.png'),
      };

      const playerContainer = new PIXI.Container();
      playerContainer.x = app.screen.width / 2;
      playerContainer.y = app.screen.height / 2;

      // 링 메뉴 작동을 위한 캐릭터 클릭(터치) 이벤트 활성화
      playerContainer.eventMode = 'static';
      playerContainer.cursor = 'pointer';
      playerContainer.on('pointerdown', e => {
        // const globalPos = playerContainer.toGlobal(new PIXI.Point(0, 0));
        // const store = useSpaceStore.getState();
        // store.setMenuPos(globalPos.x, globalPos.y);
        // store.setMenuOpen(!store.isMenuOpen); // 링 메뉴 토글
        // e.stopPropagation(); // 바탕 클릭 이벤트와 중복 방지
      });

      // 캐릭터 스프라이트 생성
      const charSprite = new PIXI.Sprite(textures.front);
      charSprite.anchor.set(0.5);

      charSprite.width = 55;
      charSprite.height = 60;

      charSprite.x = 0;
      charSprite.y = 0;
      playerContainer.addChild(charSprite);

      // 이모지 텍스트로 캐릭터 생성
      // const catCharacter = new PIXI.Text({
      //   text: '🐱',
      //   style: {
      //     fontSize: 60,
      //   },
      // });

      // catCharacter.anchor.set(0.5);
      // catCharacter.x = 0;
      // catCharacter.y = 0;
      // playerContainer.addChild(catCharacter);

      const statusText = new PIXI.Text({
        // text: useSpaceStore.getState().myStatus,
        style: {
          fontSize: 14,
          fill: 0x94a3b8,
          fontWeight: 'bold',
        },
      });
      statusText.anchor.set(0.5);
      statusText.x = 0;
      statusText.y = -45;
      playerContainer.addChild(statusText);

      const nameText = new PIXI.Text({
        text: 'ㅇㅇ',
        style: {
          fontSize: 16,
          fill: 0xffffff,
          fontWeight: 'bold',
          dropShadow: {
            alpha: 0.5,
            blur: 2,
            distance: 1,
          },
        },
      });
      nameText.anchor.set(0.5);
      nameText.x = 0;
      nameText.y = 45;
      playerContainer.addChild(nameText);

      app.stage.addChild(playerContainer);

      const keys: Record<string, boolean> = {};

      // 키보드를 누를 때 true
      const handleKeyDown = (e: KeyboardEvent) => {
        keys[e.key] = true;
      };

      // 키보드에서 손을 뗄 때 false
      const handleKeyUp = (e: KeyboardEvent) => {
        keys[e.key] = false;
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      const speed = 5;
      const baseScaleX = 55 / charSprite.texture.width;
      const baseScaleY = 60 / charSprite.texture.height;
      charSprite.scale.set(baseScaleX, baseScaleY);

      app.ticker.add(() => {
        let isMoving = false;

        if (keys['ArrowUp']) {
          playerContainer.y -= speed;
          charSprite.texture = textures.back;
          const backScaleX = 40 / textures.back.width;
          charSprite.scale.set(backScaleX);
          isMoving = true;
        } else if (keys['ArrowDown']) {
          playerContainer.y += speed;
          charSprite.texture = textures.front;
          isMoving = true;
        }

        if (keys['ArrowLeft']) {
          playerContainer.x -= speed;
          charSprite.texture = textures.side;
          charSprite.scale.x = -baseScaleX;
          isMoving = true;
        } else if (keys['ArrowRight']) {
          playerContainer.x += speed;
          charSprite.texture = textures.side;
          charSprite.scale.x = baseScaleX;
          isMoving = true;
        }

        // 캐릭터 크기 고정
        charSprite.height = 60;

        playerContainer.x = Math.max(
          30,
          Math.min(app.screen.width - 30, playerContainer.x),
        );
        playerContainer.y = Math.max(
          50,
          Math.min(app.screen.height - 50, playerContainer.y),
        );
      });

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    };

    initPixi();

    // 컴포넌트 언마운트 시 Pixi 인스턴스 정리 (메모리 누수 방지)
    return () => {
      if (app) {
        app.destroy(true, { children: true, texture: true });
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4">
      <div
        ref={canvasRef}
        className="border-4 border-slate-700 rounded-xl overflow-hidden shadow-2xl"
      />
      <p className="text-slate-400 text-sm">
        현재는 임시로 고양이 이모지🐱를 띄웠습니다.
      </p>
    </div>
  );
}
