/*
 * AI 회의록 본문 상단의 '회의 정보' 헤더를 회의 데이터(사실)로 렌더한다.
 * 진행자·일시·참석자는 AI 추측이 아니라 DB 값으로 채워 정확성을 보장한다.
 * (AI 는 헤더를 생성하지 않고 논의/결정/액션 아이템만 작성한다 — 프롬프트로 강제)
 */

// startedAt(UTC) 을 한국 시간 기준 사람이 읽기 좋은 문자열로 포맷한다.
function formatKst(date: Date): string {
  const formatted = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${formatted} KST`;
}

export function buildMeetingInfoHeader(
  startedAt: Date,
  hostName: string,
  attendeeNames: string[],
): string {
  const attendees =
    attendeeNames.length > 0 ? attendeeNames.join(', ') : '기록 없음';

  return [
    '## 📅 회의 정보',
    `- **일시:** ${formatKst(startedAt)}`,
    `- **진행자:** ${hostName}`,
    `- **참석자:** ${attendees}`,
    '',
    '---',
  ].join('\n');
}
