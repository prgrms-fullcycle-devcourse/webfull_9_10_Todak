import { redirect } from 'next/navigation';
import RoomMainContainer from './_components/RoomMainContainer';
import SidebarContainer from './_components/SidebarContainer';

import { Metadata } from 'next';
import { fetchRoomInfo } from '@/services/rooms/api.server';
import { SITE_CONFIG } from '@/constants/metadata';

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
    member_count,
    member_names,
    max_members,
    created_at,
  } = roomInfo;
  const title = `${room_name}에서 함께 협업을 시작하세요~! [${member_count}/${max_members}]`;
  const memberText =
    member_names.length > 0 ? `${member_names.join(', ')}님과` : '';
  const description = `${host_name ?? '방장'}님이 "${room_name}"에서 ${memberText} 협업을 기다리고 있습니다.`;
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  return {
    title: title,
    description: description,
    openGraph: {
      siteName: SITE_CONFIG.siteName,
      locale: 'ko_KR',
      title: title,
      description: description,
      url: `${baseURL}/room/${roomID}`,
      type: 'article',
      publishedTime: created_at,
      authors: [host_name, ...member_names],
      images: [
        {
          url: '/metadata/todak-room-image.webp',
          width: 1200,
          height: 630,
          alt: '토닥윗미 룸 이미지',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: ['/metadata/todak-room-image.webp'],
    },
  };
}

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
