export interface TodoAssignee {
  id: string;
  github_username: string | null;
  avatar_url: string | null;
}

export interface Todo {
  id: string;
  room_id: string;
  repo_id?: string | null;
  title: string;
  body: string | null;
  labels: string[];
  assignee_id?: string | null;
  github_issue_number: number | null;
  is_done: boolean;
  minutes_id: string | null;
  assignee: TodoAssignee | null;
  created_at: string;
}

export interface TodosResponse {
  todos: Todo[];
}
export interface TodosDeleteResponse {
  success: boolean;
  data: null;
}

export interface UpdateTodoPayload {
  title?: string;
  body?: string | null;
  labels?: string[];
  assignee_id?: string | null;
  is_done?: boolean;
}

export interface TodoResponse {
  todo: Todo;
}

export interface TodoLabel {
  name: string;
  color: string;
  description: string | null;
}

export interface TodoLabelsResponse {
  labels: TodoLabel[];
}

export interface CreateTodoLabelPayload {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTodoLabelPayload {
  name?: string;
  color?: string;
  description?: string | null;
}

export interface TodoLabelResponse {
  label: TodoLabel;
}

export interface TodoMilestone {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  due_on: string | null;
  open_issues: number;
  closed_issues: number;
  html_url: string;
}

export interface TodoMilestonesResponse {
  milestones: TodoMilestone[];
}

export interface TodoCommentUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface TodoComment {
  id: number;
  body: string;
  user: TodoCommentUser | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface TodoCommentsResponse {
  comments: TodoComment[];
}

export interface TodoCommentPayload {
  body: string;
}

export interface TodoCommentResponse {
  comment: TodoComment;
}

export interface TodoEventActor {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface TodoEvent {
  id: number | string;
  event: string;
  actor: TodoEventActor | null;
  created_at: string;
  label?: TodoLabel;
  milestone?: TodoMilestone;
  assignee?: TodoEventActor;
  assigner?: TodoEventActor;
  commit_id?: string | null;
  commit_url?: string | null;
}

export interface TodoEventsResponse {
  events: TodoEvent[];
}

export type TodoReactionContent =
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket'
  | 'eyes';

export interface TodoReaction {
  id: number;
  content: TodoReactionContent;
  user: TodoCommentUser | null;
  created_at: string;
}

export interface TodoReactionPayload {
  content: TodoReactionContent;
}

export interface TodoReactionResponse {
  reaction: TodoReaction;
}

export interface TodoMutationDeleteResponse {
  success: boolean;
  data: null;
}
