'use client';

import { Button } from '@heroui/react';

const todos = [
  {
    assignee: '지윤',
    state: 'done',
    text: '미팅룸 진입 감지 및 ZEP식 private 소켓 채널링 구현',
  },
  {
    assignee: '수아',
    state: 'done',
    text: 'MDX Editor 기반 회의록 수정 숏컷 인터페이스 개발',
  },
  {
    assignee: '민호',
    state: 'todo',
    text: 'GitHub API 연동 일괄 이슈 발행 및 알림 토스트 연동',
  },
  {
    assignee: '현우',
    state: 'todo',
    text: '이슈 발행 영수증 컴포넌트 마크업 고도화',
  },
];
export default function BottomInfoContainer() {
  return (
    <section className="renderer-bottom-container">
      <div className="renderer-todo-container">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-foreground">
            📋 가상 타운 실시간 To-Do (이슈 기준)
          </h2>
          <div className="flex overflow-hidden rounded-lg border border-border text-xs font-black">
            <Button
              className="h-auto min-w-0 rounded-none bg-foreground px-4 py-2 text-xs font-black text-background"
              variant="ghost"
            >
              전체 팀원 할 일
            </Button>
            <Button
              className="h-auto min-w-0 rounded-none bg-surface px-4 py-2 text-xs font-black text-muted"
              variant="ghost"
            >
              내 할 일만
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {todos.map(todo => (
            <div
              className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3 text-xs shadow-surface"
              key={todo.text}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${
                    todo.state === 'done' ? 'bg-success' : 'bg-warning'
                  }`}
                />
                <span className="truncate font-black text-foreground">
                  {todo.text}
                </span>
              </div>
              <span className="ml-3 shrink-0 font-todak-mono text-[11px] font-black text-accent">
                @{todo.assignee}
              </span>
            </div>
          ))}
        </div>
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
