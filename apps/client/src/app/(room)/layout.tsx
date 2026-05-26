import type { Metadata } from 'next';

import { QueryProvider } from '@/providers/query-provider';

import '../globals.css';
import ChatOpenButton from './@chats/_components/ChatOpenButton';

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
                id="room-chat-toggle"
                type="checkbox"
              />
              <ChatOpenButton />

              <section className="renderer-section-container">
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
