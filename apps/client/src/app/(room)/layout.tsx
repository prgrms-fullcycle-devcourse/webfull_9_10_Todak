import type { Metadata } from 'next';

import { QueryProvider } from '@/providers/query-provider';

import '../globals.css';

export const metadata: Metadata = {
  title: 'Todak',
  description: 'Todak client',
};

export default function RootLayout({
  children,
  sidebar,
  chats,
  renderer,
}: LayoutProps<'/'>) {
  return (
    <html className="todak" data-theme="todak" lang="ko">
      <body>
        <QueryProvider>
          <div className="room-layout-container">
            <aside className="sidebar-container">{sidebar}</aside>

            <main className="room-main-container">
              <input
                className="peer/chat sr-only"
                defaultChecked
                id="room-chat-toggle"
                type="checkbox"
              />

              <section className="renderer-section-container">
                <header className="room-header-container">
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
                      className="room-toggle-button"
                      htmlFor="room-chat-toggle"
                    >
                      채팅 열기/닫기
                    </label>
                  </div>
                </header>

                {renderer ?? children}
              </section>

              <aside className="chat-container">{chats}</aside>
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
