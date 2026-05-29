'use client';

interface Props {
  meetingStatus: 'ongoing' | 'ended' | 'cancelled';
  onToggle: () => void;
}

export default function ChatMeetingButton({ meetingStatus, onToggle }: Props) {
  return (
    <div className="shrink-0 border-b border-border bg-surface px-3 py-2">
      <button
        onClick={onToggle}
        className={`w-full rounded-xl py-2.5 text-xs font-black text-white transition-all ${
          meetingStatus === 'ended'
            ? 'bg-todak-coral-500 hover:bg-todak-coral-600'
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
      >
        {meetingStatus === 'ended'
          ? '🚀 회의 시작하기 (AI 분석 활성화)'
          : '✋ 회의 종료 및 AI 요약본 분석하기'}
      </button>
    </div>
  );
}
