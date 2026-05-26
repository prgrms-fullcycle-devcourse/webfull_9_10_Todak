const chatMessages = [
  {
    id: 1,
    message: '오늘 피그마 채팅 UI 확인 부탁드려요.',
    sender: '지윤',
    time: '16:10',
  },
  {
    id: 2,
    message: '회의실 B에서 API 페이로드를 같이 정리할게요.',
    sender: '민호',
    time: '16:12',
  },
  {
    id: 3,
    message: '소켓 채널링은 룸 진입 기준으로 나누면 좋겠습니다.',
    sender: '수아',
    time: '16:16',
  },
];
export default function Chats() {
  return (
    <>
      <div className="flex h-full w-[320px] flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface-secondary px-4">
          <div>
            <p className="text-xs font-black text-foreground">로비 대화방</p>
            <p className="font-todak-mono text-[9px] text-muted">
              회의 대기 중
            </p>
          </div>
          <label
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-default text-sm font-black text-default-foreground transition-colors hover:bg-default-hover"
            htmlFor="room-chat-toggle"
          >
            ×
          </label>
        </div>

        <div className="grid grid-cols-2 border-b border-border text-[11px] font-black">
          <button
            className="border-b-2 border-accent bg-surface px-3 py-2.5 text-accent"
            type="button"
          >
            전체 채널
          </button>
          <button
            className="border-b-2 border-transparent bg-surface-secondary px-3 py-2.5 text-muted"
            type="button"
          >
            프라이빗 룸
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface-secondary/60 p-4">
          {chatMessages.map(chat => (
            <div className="flex items-start gap-2.5 text-xs" key={chat.id}>
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-black text-accent">
                {chat.sender.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-foreground">
                    {chat.sender}
                  </span>
                  <span className="font-todak-mono text-[8px] text-muted">
                    {chat.time}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-surface p-2 text-[10px] leading-4 text-foreground shadow-surface">
                  {chat.message}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border bg-surface p-3">
          <input
            className="min-w-0 flex-1 rounded-lg border border-field-border bg-field px-3 py-2 text-xs text-field-foreground outline-none placeholder:text-field-placeholder focus:border-field-border-focus"
            placeholder="메시지를 전송하세요..."
          />
          <button
            className="rounded-lg bg-accent px-3 py-2 text-xs font-black text-accent-foreground transition-colors hover:bg-accent-hover"
            type="button"
          >
            전송
          </button>
        </div>
      </div>
    </>
  );
}
