import Anthropic from '@anthropic-ai/sdk';

import { env } from '../config/env';

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
