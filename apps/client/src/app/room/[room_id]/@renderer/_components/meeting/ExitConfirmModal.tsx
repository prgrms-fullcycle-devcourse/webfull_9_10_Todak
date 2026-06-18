'use client';

import { useRoomUiStore } from '@/store/useRoomUiStore';

export default function ExitConfirmModal() {
  const isExitModalOpen = useRoomUiStore(state => state.isExitModalOpen);
  const exitModalCallback = useRoomUiStore(state => state.exitModalCallback);
  const closeExitModal = useRoomUiStore(state => state.closeExitModal);

  if (!isExitModalOpen) return null;

  const handleChoice = (confirm: boolean) => {
    if (exitModalCallback) {
      exitModalCallback(confirm);
    }
    closeExitModal();
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md scale-100 rounded-2xl border border-border bg-surface/90 p-6 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in zoom-in-95">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-todak-coral-50 text-xl">
            🚨
          </div>

          <h3 className="mt-4 text-base font-black text-foreground">
            회의실 퇴장 안내
          </h3>
          <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
            당신이 현재 회의실의{' '}
            <span className="text-todak-coral-500 font-bold">
              마지막 퇴장자
            </span>
            입니다.
            <br />
            진행 중인 회의를 완전히 종료하고
            <br />
            <span className="font-bold text-foreground">AI 회의록</span>을
            생성하시겠습니까?
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleChoice(false)}
            className="rounded-xl border border-border bg-muted/50 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-muted"
          >
            아니오 (그냥 나갈래요)
          </button>
          <button
            onClick={() => handleChoice(true)}
            className="rounded-xl bg-todak-coral-500 py-2.5 text-xs font-black text-white shadow-md shadow-todak-coral-500/20 transition-all hover:bg-todak-coral-600"
          >
            네, 생성할래요! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
