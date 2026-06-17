/*
 * AI 회의록 입력(채팅 로그) 정제·압축 — 입력 토큰·비용·지연 절감 목적.
 *  1) 노이즈 필터: 빈 내용 / 이모지·기호만인 메시지 제거
 *  2) 토큰 예산 트렁케이션: 상한 초과 시 앞 맥락 + 뒤 결론을 보존하고 중간을 생략
 *
 * 정확 토큰 카운트(Anthropic API) 대신 문자 수 근사를 쓴다 — 추가 호출 없이 비용/단순성 우선.
 */

interface ChatLogMessage {
  createdAt: Date;
  content: string | null;
  user: { githubUsername: string };
}

/*
 * 입력 예산(문자 수). 일반 회의는 한참 못 미쳐 영향이 없고, 비정상적으로 긴 회의에서만
 * 트렁케이션이 작동해 비용을 상한한다. (한글·영문 혼합 기준 근사, 튜닝 가능)
 */
const MAX_CHARS = 40_000;

// 트렁케이션 시 앞부분(맥락)에 배분할 비율 — 나머지는 뒷부분(결론/액션)에 배분
const HEAD_RATIO = 0.6;

// 문자/숫자가 하나도 없는(이모지·기호·문장부호만) 메시지인지
function isSymbolOnly(text: string): boolean {
  return !/[\p{L}\p{N}]/u.test(text);
}

/*
 * 노이즈 필터: 빈 내용·공백·이모지/기호만인 메시지 제거.
 * 짧은 한글 답변("응" 등)도 의미가 있을 수 있어, 길이 기준으로는 자르지 않는다.
 */
export function filterChatNoise<T extends { content: string | null }>(
  messages: T[],
): T[] {
  return messages.filter(m => {
    const content = (m.content ?? '').trim();

    return content.length > 0 && !isSymbolOnly(content);
  });
}

function formatLine(message: ChatLogMessage): string {
  return `[${message.createdAt.toISOString()}] ${message.user.githubUsername}: ${message.content ?? ''}`;
}

// 예산 안에서 앞에서부터 담을 수 있는 줄 수
function takeWithinBudget(lines: string[], budget: number): string[] {
  const taken: string[] = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length > budget) {
      break;
    }
    taken.push(line);
    used += line.length + 1; // +1 = 줄바꿈
  }

  return taken;
}

/*
 * 채팅 로그를 AI 입력 문자열로 만든다. 예산 초과 시 앞 맥락 + 뒤 결론을 보존하고
 * 중간을 "...(중략)..." 마커로 압축한다. (필터는 호출 전 적용된 것으로 가정)
 */
export function formatChatLog(messages: ChatLogMessage[]): string {
  const lines = messages.map(formatLine);
  const total = lines.reduce((sum, line) => sum + line.length + 1, 0);

  if (total <= MAX_CHARS) {
    return lines.join('\n');
  }

  const headBudget = Math.floor(MAX_CHARS * HEAD_RATIO);
  const tailBudget = MAX_CHARS - headBudget;

  const head = takeWithinBudget(lines, headBudget);
  const tail = takeWithinBudget([...lines].reverse(), tailBudget).reverse();

  const omitted = lines.length - head.length - tail.length;
  if (omitted <= 0) {
    // 앞/뒤가 겹칠 만큼 줄이 적으면 그대로 둔다(예산 소폭 초과 허용)
    return lines.join('\n');
  }

  return [...head, `...(중략: 메시지 ${omitted}개 생략)...`, ...tail].join(
    '\n',
  );
}
