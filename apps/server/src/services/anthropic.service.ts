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
): Promise<{ contentMd: string; actionItems: string[] }> {
  const formattedChats = chatMessages
    .map(msg => `[${msg.createdAt}] ${msg.user.githubUsername}: ${msg.content}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: `당신은 개발 팀의 미팅 로그를 분석하는 전문 프로젝트 매니저(PM) AI입니다.
      제공된 채팅 로그를 바탕으로 다음 두 가지를 수행하고, 오직 지정된 **JSON 포맷**으로만 답변하세요.
      텍스트 설명이나 앞뒤 인사말은 절대 포함하지 마세요.

      1. content_md: 미팅 내용을 일목요연하게 정리한 마크다운 형식의 회의록 본문
      2. action_items: 대화 중 도출된 구체적인 할 일 리스트 (문자열 배열)
         - "누가, 언제까지, 무엇을" 하기로 했는지 대화 기반으로 명확히 추출하세요.
         - 만약 할 일이 명확히 없다면 빈 배열([])을 반환하세요.

      [반환 포맷 예시]
      {
        "content_md": "# 5월 23일 스크럼 미팅\\n\\n## 1. 진행 상황...",
        "action_items": [
          "프론트엔드 소켓 연동 구조 설계 (@홍길동)",
          "이슈 대량 등록 API 예외 처리 추가 (@신상호)"
        ]
      }`,
    messages: [
      {
        role: 'user',
        content: `다음 대화 로그를 분석해 JSON으로 반환해 주세요:\n\n${formattedChats}`,
      },
    ],
  });

  const responseText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const result = JSON.parse(responseText);

    return {
      contentMd: result.content_md ?? '',
      actionItems: result.action_items ?? [],
    };
  } catch (error) {
    console.error('❌ Claude 응답 JSON 파싱 실패:', error);
    return {
      contentMd: responseText,
      actionItems: [],
    };
  }
}
