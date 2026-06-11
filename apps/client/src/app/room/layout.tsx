import RoomMainContainer from './_components/RoomMainContainer';
import SidebarContainer from './_components/SidebarContainer';

export default function RoomLayout({
  children,
  sidebar,
  chats,
  renderer,
}: LayoutProps<'/room'>) {
  return (
    <div className="room-layout-container">
      <SidebarContainer>{sidebar}</SidebarContainer>

      <RoomMainContainer chats={chats}>
        {renderer ?? children}
      </RoomMainContainer>
    </div>
  );
}
