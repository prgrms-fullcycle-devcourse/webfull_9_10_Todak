import Anthropic from '@anthropic-ai/sdk';

import { env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client/index.js';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

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

export async function generateMinutesSummary(
  chatMessages: ChatMessageWithUser[],
): Promise<{ title: string; contentMd: string; actionItems: string[] }> {
  const formattedChats = chatMessages
    .map(msg => `[${msg.createdAt}] ${msg.user.githubUsername}: ${msg.content}`)
    .join('\n');

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
      반드시 save_minutes 도구를 호출하여 결과를 반환하세요.`,
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
                '미팅 내용을 일목요연하게 정리한 마크다운 형식의 회의록 본문',
            },
            action_items: {
              type: 'array',
              items: { type: 'string' },
              description:
                '대화 중 도출된 구체적인 할 일 리스트. "누가, 언제까지, 무엇을" 하기로 했는지 명확히 추출하고, 할 일이 없으면 빈 배열을 반환합니다.',
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
        content: `다음 대화 로그를 분석해 save_minutes 도구로 정리해 주세요:\n\n${formattedChats}`,
      },
    ],
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');

  if (toolUse?.type === 'tool_use') {
    const result = toolUse.input as {
      title?: string;
      content_md?: string;
      action_items?: string[];
    };

    return {
      title: result.title ?? '',
      contentMd: result.content_md ?? '',
      actionItems: result.action_items ?? [],
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
