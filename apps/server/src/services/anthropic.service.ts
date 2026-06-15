import Anthropic from '@anthropic-ai/sdk';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client/index.js';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/*
 * 기존 회의록 본문을 지시문에 맞춰 재작성한다(동기).
 * 전체 생성보다 가벼워 즉시 응답용으로 사용. 마크다운 본문만 반환.
 */
export async function refineMinutesContent(
  contentMd: string,
  instruction: string,
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `당신은 개발 팀의 회의록을 다듬는 전문 에디터입니다.
        원본 회의록을 요구사항에 맞춰 재작성하되, 사실 관계와 핵심 결정사항/액션 아이템은 보존하세요.
        설명·서론·코드펜스 없이 다듬어진 마크다운 본문만 반환하세요.`,
      messages: [
        {
          role: 'user',
          content: `[원본 회의록]\n${contentMd}\n\n[요구 사항]\n${instruction}`,
        },
      ],
    });

    const block = response.content[0];
    if (block === undefined || block.type !== 'text') {
      throw new AppError('AI_API_ERROR');
    }

    return block.text.trim();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('❌ 회의록 AI 다듬기 실패:', error);
    throw new AppError('AI_API_ERROR');
  }
}

export async function reviewCode(
  code: string,
  context?: string,
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${context !== undefined && context !== '' ? `Context: ${context}\n\n` : ''}Please review the following code:\n\`\`\`\n${code}\n\`\`\``,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return content.text;
}

type ChatMessageWithUser = Prisma.ChatMessageGetPayload<{
  include: { user: true };
}>;

interface MinutesActionItem {
  title: string;
  body?: string;
  labels: string[];
  // AI 가 지목한 담당자 github_username (제공된 멤버 명단 중 하나, 없으면 undefined)
  assigneeGithubUsername?: string;
}

// 담당자 후보(룸 멤버 전체) — 회의 미참여 멤버도 지목될 수 있어 전체를 넘긴다
interface MinutesMember {
  githubUsername: string;
  nickname: string | null;
}

export async function generateMinutesSummary(
  chatMessages: ChatMessageWithUser[],
  members: MinutesMember[] = [],
): Promise<{
  title: string;
  contentMd: string;
  actionItems: MinutesActionItem[];
}> {
  const formattedChats = chatMessages
    .map(msg => `[${msg.createdAt}] ${msg.user.githubUsername}: ${msg.content}`)
    .join('\n');

  const memberRoster =
    members
      .map(m => {
        const name =
          m.nickname !== null && m.nickname !== ''
            ? `, 이름/닉네임: ${m.nickname}`
            : '';

        return `- github_username: ${m.githubUsername}${name}`;
      })
      .join('\n') || '(명단 없음)';

  /*
   * 응답 형식을 강제하기 위해 tool use(함수 호출)를 사용한다.
   * tool_choice로 호출을 강제하면 모델이 스키마에 맞는 구조화된 input을 반환하므로,
   * 자유 텍스트 JSON을 파싱하다 ```json 펜스/잡담/잘림으로 실패하는 문제가 사라진다.
   */
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: `당신은 개발 팀의 미팅 로그를 분석하는 전문 프로젝트 매니저(PM) AI입니다.
      제공된 채팅 로그를 바탕으로 회의 제목, 회의록 본문, 액션 아이템을 정리하고,
      반드시 save_minutes 도구를 호출하여 결과를 반환하세요.
      '할 일'과 '담당자'(누가 무엇을 하기로 했는지)는 오직 action_items 필드로만 반환하세요.
      회의록 본문(content_md)에는 할 일·담당자를 나열하는 목록·체크리스트·요약 표
      (예: '결정 사항 요약' 표에 담당/할 일 칼럼)를 절대 넣지 마세요. 본문에 할 일 할당을 중복하지 마세요.
      본문의 결정 사항은 표가 아니라 서술형 문장으로 적으세요.
      액션 아이템의 담당자(assignee_github_username)는, 대화에서 그 일을 누가 하기로
      명확히 정해진 경우에만 제공된 멤버 명단의 github_username 중에서 지정하세요.
      이름/닉네임으로 언급됐어도 명단의 해당 github_username으로 매핑하세요.
      담당자가 애매하거나 명단에 없으면 비워 두세요(필드 생략).`,
    tools: [
      {
        name: 'save_minutes',
        description: '분석한 회의 제목, 회의록 본문, 액션 아이템을 저장합니다.',
        input_schema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description:
                '회의 내용을 대표하는 간결한 제목 (예: "5월 23일 스프린트 회의 - 소켓 연동 논의")',
            },
            content_md: {
              type: 'string',
              description:
                '회의의 논의 사항과 결정 사항을 일목요연하게 정리한 마크다운 본문. 단, 할 일·담당자를 나열하는 목록이나 요약 표(담당/할 일 칼럼 등)는 넣지 마세요 — 그건 action_items 의 역할입니다. 결정 사항은 서술형 문장으로만 작성합니다.',
            },
            action_items: {
              type: 'array',
              description:
                '대화 중 도출된 구체적인 할 일 리스트. 할 일이 없으면 빈 배열을 반환합니다.',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description:
                      '할 일을 한 줄로 요약한 제목. "누가, 언제까지, 무엇을" 하기로 했는지 명확히 작성합니다.',
                  },
                  body: {
                    type: 'string',
                    description: '할 일의 배경/상세 설명 (선택)',
                  },
                  labels: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                      'GitHub 이슈 라벨로 쓸 분류 태그 (예: ["backend", "bug"]). 없으면 빈 배열.',
                  },
                  assignee_github_username: {
                    type: 'string',
                    description:
                      '이 할 일의 담당자 github_username. 반드시 제공된 멤버 명단 중 하나여야 하며, 대화에서 담당자가 명확히 정해진 경우에만 지정. 애매하면 생략.',
                  },
                },
                required: ['title'],
              },
            },
          },
          required: ['title', 'content_md', 'action_items'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'save_minutes' },
    messages: [
      {
        role: 'user',
        content: `[회의실 멤버 명단] (담당자는 이 명단의 github_username 중에서만 지정)\n${memberRoster}\n\n다음 대화 로그를 분석해 save_minutes 도구로 정리해 주세요:\n\n${formattedChats}`,
      },
    ],
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');

  if (toolUse?.type === 'tool_use') {
    const result = toolUse.input as {
      title?: string;
      content_md?: string;
      action_items?: Array<{
        title?: string;
        body?: string;
        labels?: string[];
        assignee_github_username?: string;
      }>;
    };

    // 필드 누락에 대비해 정규화 (title은 필수, labels는 항상 배열)
    const actionItems: MinutesActionItem[] = (result.action_items ?? [])
      .filter(item => (item.title ?? '') !== '')
      .map(item => ({
        title: item.title ?? '',
        body: item.body,
        labels: item.labels ?? [],
        assigneeGithubUsername:
          item.assignee_github_username !== undefined &&
          item.assignee_github_username !== ''
            ? item.assignee_github_username
            : undefined,
      }));

    return {
      title: result.title ?? '',
      contentMd: result.content_md ?? '',
      actionItems,
    };
  }

  // 도구 호출이 없을 경우(이론상 발생하지 않음)의 안전한 기본값
  console.error('❌ Claude가 save_minutes 도구를 호출하지 않았습니다.');
  return {
    title: '',
    contentMd: '',
    actionItems: [],
  };
}

interface ResolvedActionItem {
  title: string;
  body?: string;
  labels: string[];
  assignee: {
    id: string;
    github_username: string;
    avatar_url: string | null;
  } | null;
}

/*
 * AI 가 지목한 담당자 github_username 을 룸 멤버 User 로 매핑한다.
 * 명단에 없거나 미지목이면 assignee = null. (순수 함수 — 테스트 용이)
 */
export function resolveActionItemAssignees(
  actionItems: MinutesActionItem[],
  members: Array<{
    id: string;
    githubUsername: string;
    avatarUrl: string | null;
  }>,
): ResolvedActionItem[] {
  const memberByUsername = new Map(members.map(m => [m.githubUsername, m]));

  return actionItems.map(item => {
    const matched =
      item.assigneeGithubUsername !== undefined
        ? memberByUsername.get(item.assigneeGithubUsername)
        : undefined;

    return {
      title: item.title,
      body: item.body,
      labels: item.labels,
      assignee: matched
        ? {
            id: matched.id,
            github_username: matched.githubUsername,
            avatar_url: matched.avatarUrl,
          }
        : null,
    };
  });
}
