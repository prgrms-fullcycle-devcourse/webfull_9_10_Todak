/* eslint-disable @typescript-eslint/naming-convention */
import { Server, Socket } from 'socket.io';

import { PrivateRoomInfo } from '../services/private-room.service.js';

/*
 * Chat 이벤트 페이로드 (REST 응답과 동일한 snake_case)
 * client 가 room_id / private_room_id 로 어느 채팅창에 넣을지 라우팅
 */
export interface ChatEventPayload {
  id: string;
  room_id: string;
  private_room_id: string | null;
  user: {
    github_username: string;
    avatar_url: string | null;
  };
  content: string | null;
  type: string;
  created_at: string;
  reactions: { emoji: string; count: number; me: boolean }[];
}

export type ChatSendAck =
  | { ok: true; chat: ChatEventPayload }
  | { ok: false; code: string; message: string };

/*
 * 메시지 이모지 반응 토글 결과 페이로드
 * action 으로 추가/제거를 구분 → 클라이언트가 카운트/내 반응 상태 갱신
 */
export interface ChatReactionEventPayload {
  message_id: string;
  room_id: string;
  private_room_id: string | null;
  emoji: string;
  user: {
    id: string;
    github_username: string;
    avatar_url: string | null;
  };
  action: 'added' | 'removed';
}

export type ChatReactAck =
  | { ok: true; reaction: ChatReactionEventPayload }
  | { ok: false; code: string; message: string };

// 이슈 이벤트 페이로드
export interface TodoEventPayload {
  id: string;
  room_id: string;
  title: string;
  body: string | null;
  labels: string[];
  assignee_id: string | null;
  minutes_id: string | null;
  github_issue_number: number | null;
  is_done: boolean;
  created_at: Date;
}

// 유저 정보 (JWT 검증 후 socket.data.user 에 저장됨)
export interface SocketUser {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string;
}

/*
 * 서버 → 클라이언트 이벤트
 * 새 이벤트 추가 시 여기에 타입 정의
 */
export interface ServerToClientEvents {
  // Room
  'room:user-joined': (data: {
    userId: string;
    login: string;
    avatarUrl: string;
  }) => void;
  'room:user-left': (data: { userId: string }) => void;
  'room:member-status-changed': (data: {
    userId: string;
    status: string;
  }) => void;
  'room:member-moved': (data: {
    userId: string;
    posX: number;
    posY: number;
  }) => void;
  'room:member-joined': (data: {
    roomId: string;
    userId: string;
    login: string;
    avatarUrl: string;
  }) => void;
  'room:updated': (data: {
    id: string;
    name: string;
    max_members: number;
  }) => void;

  // Repo
  'repo:deleted': (data: { roomId: string; repoId: string }) => void;

  // 이슈
  'todo:created': (data: { roomId: string; todos: TodoEventPayload[] }) => void;
  'todo:deleted': (data: { roomId: string; todoId: string }) => void;

  // Private Room
  'room:private-rooms-updated': (data: PrivateRoomInfo[]) => void;

  // Chat
  'chat:message': (data: ChatEventPayload) => void;
  'chat:reaction': (data: ChatReactionEventPayload) => void;

  // Meeting
  'meeting:started': (data: { meetingId: string; hostId: string }) => void;
  'meeting:ended': (data: { meetingId: string }) => void;
  'meeting:user-joined': (data: { userId: string; login: string }) => void;
  'meeting:user-left': (data: { userId: string }) => void;

  // Minutes
  'minutes:generation-started': (data: {
    room_id: string;
    minutes_id: string;
    meeting_id: string;
  }) => void;
  'minutes:generated': (data: {
    room_id: string;
    minutes_id: string;
    meeting_id: string;
    title: string;
    action_items: { title: string; body?: string; labels: string[] }[];
    status: 'draft';
  }) => void;
  'minutes:generation-failed': (data: {
    room_id: string;
    minutes_id: string;
    meeting_id?: string;
    status: 'failed';
  }) => void;

  // System
  error: (data: { message: string; code: string }) => void;
}

/*
 * 클라이언트 → 서버 이벤트
 * 새 이벤트 추가 시 여기에 타입 정의
 */
export interface ClientToServerEvents {
  // Room
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'room:status-change': (data: { roomId: string; status: string }) => void;
  'room:move': (data: { roomId: string; posX: number; posY: number }) => void;

  // Private Room
  'private-room:enter': (data: {
    roomId: string;
    privateRoomId: string;
  }) => void;
  'private-room:leave': (data: {
    roomId: string;
    privateRoomId: string;
  }) => void;

  // Chat
  'chat:send': (
    data: { roomId: string; content: string; privateRoomId?: string },
    ack?: (response: ChatSendAck) => void,
  ) => void;
  'chat:react': (
    data: {
      roomId: string;
      privateRoomId?: string;
      messageId: string;
      emoji: string;
    },
    ack?: (response: ChatReactAck) => void,
  ) => void;

  // Meeting (시작/종료는 REST 담당 — 여기선 회의 room 입·퇴장만)
  'meeting:join': (data: { meetingId: string }) => void;
  'meeting:leave': (data: { meetingId: string }) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {}

/*
 * socket.data 에 저장되는 데이터
 */
export interface SocketData {
  user: SocketUser;
}

/*
 * 타입이 적용된 Server / Socket (이걸 import 해서 사용)
 */
export type TypedIO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
