'use client';

import { Button } from '@heroui/react';

const pullRequests = [
  {
    id: 142,
    time: '10분 전',
    title: '채팅 이모지 반응 UI 수정',
  },
  {
    id: 138,
    time: '1시간 전',
    title: '웹소켓 자동 재연결 로직 구현',
  },
  {
    id: 135,
    time: '3시간 전',
    title: '메인 대시보드 마일스톤 생성기',
  },
];

const members = [
  {
    avatar: '🐶',
    label: '민호',
    left: '78%',
    status: '💬',
    top: '30%',
  },
  {
    avatar: '🦁',
    label: '현우',
    left: '70%',
    status: '💤',
    top: '76%',
  },
];

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

export default function Renderer() {
  return (
    <div className="renderer-container">
      <div className="renderer-stage-container">
        <div className="renderer-toolbar">
          <span className="border-r border-border pr-3 text-xs font-black text-foreground">
            ⚡ 빠른 이동
          </span>
          <Button className="renderer-toolbar-button" variant="ghost">
            🚪 회의실 A
          </Button>
          <Button className="renderer-toolbar-button" variant="ghost">
            🚪 회의실 B
          </Button>
          <Button className="renderer-toolbar-button" variant="ghost">
            ☕ 라운지
          </Button>
        </div>

        <div className="renderer-surface">
          <div className="absolute inset-0 todak-grid-bg" />

          <div className="review-station-card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-black text-slate-200">
                📋 Review Station (PR)
              </p>
              <span className="rounded-md bg-accent/10 px-2 py-1 font-todak-mono text-[10px] font-black text-accent">
                Webhook Sync
              </span>
            </div>

            <div className="space-y-2">
              {pullRequests.map(pr => (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[10px]"
                  key={pr.id}
                >
                  <p className="min-w-0 truncate font-bold">
                    <span className="mr-1 font-todak-mono font-black text-accent">
                      #{pr.id}
                    </span>
                    {pr.title}
                  </p>
                  <span className="shrink-0 font-todak-mono text-[10px] text-slate-400">
                    {pr.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <section className="todak-room todak-room-idle absolute left-[40px] top-[40px] flex h-[160px] w-[200px] flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-foreground">
                ROOM A
              </span>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-black text-success-soft-foreground">
                🟢 회의 가능
              </span>
            </div>
            <div className="flex justify-center">
              <div className="rounded-full border border-border bg-surface px-6 py-2 text-[10px] font-black text-muted shadow-surface">
                테이블
              </div>
            </div>
            <p className="text-center font-todak-mono text-[9px] text-muted">
              X: 40 ~ 240 / Y: 40 ~ 200
            </p>
          </section>

          <section className="todak-room todak-room-idle absolute right-[40px] top-[40px] flex h-[160px] w-[200px] flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-foreground">
                ROOM B
              </span>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-black text-success-soft-foreground">
                🟢 회의 가능
              </span>
            </div>
            <div className="flex justify-center">
              <div className="rounded-full border border-border bg-surface px-6 py-2 text-[10px] font-black text-muted shadow-surface">
                회의탁
              </div>
            </div>
            <p className="text-center font-todak-mono text-[9px] text-muted">
              X: 360 ~ 560 / Y: 40 ~ 200
            </p>
          </section>

          <div className="absolute bottom-[60px] left-1/2 flex h-[80px] w-[200px] -translate-x-1/2 items-center justify-center rounded-lg border border-dashed border-accent-soft bg-accent-soft/20 text-[10px] font-black text-accent">
            ☕ 공용 대기 라운지
          </div>

          <div className="absolute left-[50%] top-[78%] z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div className="mb-2 flex rounded-full border border-border bg-surface px-2 py-1 shadow-surface">
              {['📝', '☕', '💬', '💤'].map(status => (
                <span className="px-0.5 text-xs" key={status}>
                  {status}
                </span>
              ))}
            </div>
            <div className="flex size-12 items-center justify-center rounded-full border-4 border-accent bg-surface text-2xl shadow-surface">
              🐼
            </div>
            <span className="mt-1 rounded-md bg-accent px-2 py-1 text-[11px] font-black text-accent-foreground shadow-surface">
              수정 (📝)
            </span>
          </div>

          {members.map(member => (
            <div
              className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              key={member.label}
              style={{ left: member.left, top: member.top }}
            >
              <div className="relative flex size-10 items-center justify-center rounded-full border border-border bg-surface text-xl shadow-surface">
                {member.avatar}
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-[11px]">
                  {member.status}
                </span>
              </div>
              <span className="mt-1 rounded bg-foreground px-2 py-1 text-[10px] font-black text-background">
                {member.label}
              </span>
            </div>
          ))}

          <div className="absolute bottom-3 right-3 z-20 w-[110px] rounded-lg border border-border bg-surface p-2 shadow-surface">
            <p className="mb-2 text-[10px] font-black text-muted">
              🗺️ 미니맵 (Canvas)
            </p>
            <div className="relative h-[62px] overflow-hidden rounded border border-border bg-surface-secondary">
              <span className="absolute left-[30%] top-[55%] size-2 rounded-full bg-accent" />
              <span className="absolute left-[45%] top-[25%] size-2 rounded-full bg-foreground" />
              <span className="absolute left-[72%] top-[63%] size-2 rounded-full bg-foreground" />
              <span className="absolute left-[22%] top-[30%] size-2 rounded-full bg-foreground" />
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
