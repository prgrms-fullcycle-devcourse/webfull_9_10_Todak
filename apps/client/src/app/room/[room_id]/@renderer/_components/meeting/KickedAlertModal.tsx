'use client';

import { getSocket } from '@/lib/socket';
import { Button } from '@heroui/react';
import { useEffect, useState } from 'react';

interface KickedAlertModalProps {
  roomID: string;
}

export default function KickedAlertModal({ roomID }: KickedAlertModalProps) {
  const [isKicked, setIsKicked] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    // 소켓 room:kicked 이벤트 수신 핸들러
    const handleKicked = (data: { roomId: string }) => {
      if (data.roomId === roomID) {
        setIsKicked(true);
      }
    };

    // 소켓 이벤트 리스너 상시 활성화 가동
    socket.on('room:kicked', handleKicked);

    return () => {
      socket.off('room:kicked', handleKicked);
    };
  }, [roomID]);

  if (!isKicked) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md scale-100 rounded-2xl border border-border bg-surface/90 p-6 shadow-2xl backdrop-blur-md text-center animate-in zoom-in-95">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-todak-coral-50 text-xl mx-auto">
          🚨
        </div>
        <p className="todak-section-label text-todak-coral-500 font-black mt-4">
          ACCESS DENIED
        </p>
        <h3 className="mt-2 text-base font-black text-foreground">
          룸 권한이 제거됐습니다.
        </h3>
        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
          이 프로젝트 룸의 GitHub 협업자 명단에서 제외되었거나 추방되었습니다.
          <br />
          <span className="font-bold text-foreground">안전한 이용</span>을 위해
          메인 화면으로 이동합니다.
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            className="h-9 rounded-xl bg-foreground px-5 text-xs font-black text-background shadow-sm hover:bg-slate-800"
            onPress={() => window.location.assign('/')}
          >
            확인 및 홈으로 이동 🚀
          </Button>
        </div>
      </div>
    </div>
  );
}
