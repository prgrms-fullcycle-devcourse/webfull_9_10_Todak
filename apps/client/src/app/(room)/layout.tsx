import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/providers/query-provider';

import '../globals.css';

export const metadata: Metadata = {
  title: 'Todak',
  description: 'Todak client',
};

interface RootLayoutProps {
  sidebar: ReactNode;
  chats: ReactNode;
  renderer: ReactNode;
}

export default function RootLayout({
  sidebar,
  chats,
  renderer,
}: Readonly<RootLayoutProps>) {
  return (
    <html className="todak" data-theme="todak" lang="ko">
      <body>
        <QueryProvider>
          <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
            <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-background p-4">
              {sidebar}
            </aside>

            <main className="relative flex min-w-0 flex-1 overflow-hidden bg-surface-secondary">
              <input
                className="peer/chat sr-only"
                defaultChecked
                id="room-chat-toggle"
                type="checkbox"
              />

              <section className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6 shadow-surface">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-accent">
                      Todak Workspace
                    </p>
                    <h1 className="text-sm font-black text-foreground">
                      2D 가상 협업 타운
                    </h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-black text-success-soft-foreground">
                      회의 가능
                    </span>
                    <label
                      className="cursor-pointer rounded-lg bg-default px-3 py-2 text-xs font-black text-default-foreground shadow-surface transition-colors hover:bg-default-hover"
                      htmlFor="room-chat-toggle"
                    >
                      채팅 열기/닫기
                    </label>
                  </div>
                </header>

                {renderer}
              </section>

              <aside className="h-full w-0 shrink-0 overflow-hidden border-l border-border bg-surface transition-[width] duration-300 peer-checked/chat:w-[320px]">
                {chats}
              </aside>
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
