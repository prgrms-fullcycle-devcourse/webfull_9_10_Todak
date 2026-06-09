export type Member = {
  github_username: string;
  avatar_url: string;
  role: string;
  character_type: string;
  nickname: string;
  status: string;
  is_host: boolean;
  pos_x: number;
  pos_y: number;
};

export type Members = Member[];
