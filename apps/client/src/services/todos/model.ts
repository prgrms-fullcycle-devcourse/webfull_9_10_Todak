export interface TodoAssignee {
  id: string;
  github_username: string | null;
  avatar_url: string | null;
}

export interface Todo {
  id: string;
  room_id: string;
  title: string;
  body: string | null;
  labels: string[];
  github_issue_number: number | null;
  is_done: boolean;
  minutes_id: string | null;
  assignee: TodoAssignee | null;
  created_at: string;
}

export interface TodosResponse {
  todos: Todo[];
}
