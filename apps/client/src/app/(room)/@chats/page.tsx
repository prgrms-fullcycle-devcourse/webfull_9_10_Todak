'use client';

import { Button } from '@heroui/react';

import ChatCloseButton from './_components/ChatCloseButton';
import ChatHeader from './_components/ChatHeader';

const chatMessages = [
  {
    id: 1,
    message: '오늘 피그마 채팅 UI 확인 부탁드려요.',
    sender: '지윤',
    time: '16:10',
  },
  {
    id: 2,
    message: '회의실 B에서 API 페이로드를 같이 정리할게요.',
    sender: '민호',
    time: '16:12',
  },
  {
    id: 3,
    message: '소켓 채널링은 룸 진입 기준으로 나누면 좋겠습니다.',
    sender: '수아',
    time: '16:16',
  },
];

export default function Chats() {
  return (
    <div className="chat-panel-container">
      <ChatHeader />
      채팅방 영역
    </div>
  );
}
