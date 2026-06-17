export interface Minute {
  id: string;
  title: string;
  type: string;
  status: string;
  author: Author;
  participant_names?: string[];
  linked_issue_numbers: number[];
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  github_username: string;
  avatar_url: string;
}

export interface MinutesList {
  minutes: Minute[];
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
    total_count: number;
  };
}

export interface ActionItem {
  title: string;
  body?: string;
  labels: string[];
  assignee: {
    id: string;
    github_username: string;
    avatar_url: string;
  } | null;
}

export interface MinuteDetail {
  id: string;
  room_id: string;
  meeting_id: string;
  title: string;
  type: 'meeting' | 'troubleshooting' | 'etc';
  content_md: string;
  action_items: ActionItem[];
  status: string;
  linked_issue_numbers: number[];
  author: Author;
  created_at: string;
  updated_at: string;
}

export interface StartMeeting {
  id: string;
  status: 'ongoing' | 'ended';
  started_at: string;
  host_id: string;
  participants: string[];
}

export interface EndMeeting {
  id: string;
  status: 'ended';
  ended_at: string;
  message_count: number;
}

// 회의록 수정
export interface UpdateMinutesRequest {
  title?: string;
  type?: 'meeting' | 'troubleshooting' | 'etc';
  content_md?: string;
  status?: 'confirmed' | 'draft';
  action_items?: ActionItem[];
}

export interface UpdateMinutesResponse {
  id: string;
  room_id: string;
  title: string;
  type: 'meeting' | 'troubleshooting' | 'etc';
  content_md: string;
  action_items: ActionItem[];
  status: 'draft' | 'confirmed' | 'generating' | 'failed';
  linked_issue_numbers: number[];
  updated_at: string;
}

export interface MinutesGeneratedEvent {
  room_id: string;
  minutes_id: string;
  meeting_id: string;
  title: string;
  action_items: ActionItem[];
  status: 'draft';
}

export interface MinutesGenerationFailedEvent {
  room_id: string;
  minutes_id: string;
  meeting_id?: string;
  status: 'failed';
  reason: 'MINUTES_NO_CHAT_LOG' | 'MEETING_NOT_FOUND' | 'GENERATION_ERROR';
}

export interface MinutesUpdatedEvent {
  minutes_id: string;
}

export interface MinutesLockEvent {
  minutes_id: string;
  user_id: string;
}

// AI 회의록 다듬기
export interface RefineMinutesRequest {
  refine_type: 'SHORTEN' | 'BULLET' | 'CUSTOM';
  custom_message?: string;
}

export interface RefineMinutesResponse {
  id: string;
  refined_content_md: string;
}

export interface MinutesLockEvent {
  minutes_id: string;
  user_id: string;
  login: string;
}
