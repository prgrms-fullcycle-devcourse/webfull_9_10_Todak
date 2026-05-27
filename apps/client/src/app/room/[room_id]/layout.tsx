import ChatOpenButton from './@chats/_components/ChatOpenButton';

export default function RoomLayout({
  children,
  sidebar,
  chats,
  renderer,
}: LayoutProps<'/room/[room_id]'>) {
  return (
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
  );
}
