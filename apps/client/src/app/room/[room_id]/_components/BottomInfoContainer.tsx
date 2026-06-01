import BottomTodoTabs from './BottomTodoTabs';

export default function BottomInfoContainer() {
  return (
    <section className="renderer-bottom-container">
      <div className="renderer-todo-container">
        <BottomTodoTabs />
      </div>

      <div className="renderer-news-container">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-lg bg-accent px-3 py-1.5 font-todak-mono text-[11px] font-black text-accent-foreground">
            GITHUB NEWS
          </span>
          <p className="truncate text-xs font-semibold">
            💬 [GitHub] team/todak-with-me 레포지토리에 새 코멘트가
            등록되었습니다.
          </p>
        </div>
        <span className="font-todak-mono text-[10px] text-slate-400">
          이슈 실시간 싱크 활성
        </span>
      </div>
    </section>
  );
}
