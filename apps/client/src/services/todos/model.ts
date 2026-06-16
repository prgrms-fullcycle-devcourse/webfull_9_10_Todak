export interface TodoAssignee {
  id: string;
  github_username: string | null;
  avatar_url: string | null;
}

export interface Todo {
  id: string;
  room_id: string;
  repo_id: string | null;
  title: string;
  body: string | null;
  labels: string[];
  github_issue_number: number | null;
  milestone_number: number | null;
  is_done: boolean;
  minutes_id: string | null;
  assignee: TodoAssignee | null;
  created_at: string;
  reactions?: TodoReaction[];
}

export interface TodoItem {
  title: string;
  body?: string | null;
  labels: string[];
  assignee_id?: string | null;
  minutes_id?: string | null;
  create_issue: boolean;
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
  assignee_ids?: string[];
  milestone_number?: number | null;
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
  color: string;
  description?: string;
}

export interface UpdateTodoLabelPayload {
  new_name?: string;
  color?: string;
  description?: string;
}

export interface TodoLabelResponse {
  label: TodoLabel;
}

export interface TodoMilestone {
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  dueOn: string | null;
  openIssues: number;
  closedIssues: number;
}

export interface TodoMilestonesResponse {
  milestones: TodoMilestone[];
}

export interface TodoComment {
  id: number;
  body: string;
  authorLogin: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
  reactions?: TodoReaction[];
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

export interface TodoEvent {
  id: number;
  event: string;
  actorLogin: string;
  actorAvatarUrl: string;
  createdAt: string;
  label?: string;
  assignee?: string;
  milestone?: string;
  issue_type?: {
    color?: string;
    name: string;
  } | null;
  project_card?: {
    column_name?: string | null;
    previous_column_name?: string | null;
    project_name?: string | null;
    project_url?: string | null;
  } | null;
  project_field?: {
    field_name?: string | null;
    from?: string | null;
    project_name?: string | null;
    to?: string | null;
  } | null;
  rename?: {
    from: string;
    to: string;
  } | null;
  commit_id?: string | null;
  commit_url?: string | null;
  performed_via_github_app?: {
    name: string;
  } | null;
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
  userLogin?: string;
  user_login?: string;
  createdAt?: string;
  created_at?: string;
}

export interface TodoReactionPayload {
  content: TodoReactionContent;
}

export interface TodoReactionResponse {
  reaction: TodoReaction;
}

export type TodoMutationDeleteResponse = null;

// ai 생성 아이템
export interface ApiTodo {
  id: string;
  room_id: string;
  title: string;
  body: string | null;
  labels: string[];
  github_issue_number: number | null;
  is_done: boolean;
  minutes_id: string | null;
  assignee_id: string | null;
  created_at: string;
}

export interface CreateTodosRequest {
  todos: TodoItem[];
}

export interface CreateTodosResponse {
  todos: ApiTodo[];
}
