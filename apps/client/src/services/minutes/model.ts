export interface Minute {
  id: string;
  title: string;
  type: string;
  status: string;
  author: Author;
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

export interface MinuteDetail {
  id: string;
  room_id: string;
  meeting_id: string;
  title: string;
  type: string;
  content_md: string;
  action_items: string[];
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
