import { apiServer } from '@/lib/api.server';
import RoomMainContainer from './_components/RoomMainContainer';
import SidebarContainer from './_components/SidebarContainer';

import { Metadata } from 'next';
import { fetchRoomInfo } from '@/services/rooms/api.server';

type Props = {
  params: Promise<{ room_id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const roomID = (await params).room_id;
  const roomInfo = await fetchRoomInfo(roomID);
  if (!roomInfo) {
    return {};
  }
  const {
    room_name,
    host_name,
    repo_name,
    member_count,
    member_names,
    max_members,
    created_at,
  } = roomInfo;
  const title = `${room_name}에서 함께 협업을 시작하세요~! [${member_count}/${max_members}]`;
  const description = `${host_name}님이 ${room_name}에서 ${member_names.map((n, i) => (i === member_names.length ? `${n}님과` : `${n}, `))} 협업을 기다리고 있습니다.`;
  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/room/${roomID}`,
      type: 'article',
      publishedTime: created_at, // 생성일
      authors: [host_name, ...member_names],
      images: [
        {
          url: '/metadata/todak-room-image.webp',
          width: 1200,
          height: 630,
          alt: '토닥윗미 대표 이미지',
        },
      ],
    },
  };
}

export default async function RoomLayout({
  children,
  sidebar,
  chats,
  renderer,
}: LayoutProps<'/room/[room_id]'>) {
  return (
    <div className="room-layout-container">
      <SidebarContainer>{sidebar}</SidebarContainer>
      <RoomMainContainer chats={chats}>
        {renderer ?? children}
      </RoomMainContainer>
    </div>
  );
}
