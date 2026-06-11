import RoomMainContainer from './_components/RoomMainContainer';
import SidebarContainer from './_components/SidebarContainer';

interface RoomProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  chats: React.ReactNode;
  renderer?: React.ReactNode;
}

export default async function RoomLayout({
  children,
  sidebar,
  chats,
  renderer,
}: RoomProps) {
  return (
    <div className="room-layout-container">
      <SidebarContainer>{sidebar}</SidebarContainer>

      <RoomMainContainer chats={chats}>
        {renderer ?? children}
      </RoomMainContainer>
    </div>
  );
}
