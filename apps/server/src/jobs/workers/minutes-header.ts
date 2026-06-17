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

// 회의 정보 헤더 시작 표식 — 헤더 유무 판별/분리에 사용
const MEETING_INFO_HEADER_PREFIX = '## 📅 회의 정보';

export function buildMeetingInfoHeader(
  startedAt: Date,
  hostName: string,
  attendeeNames: string[],
): string {
  const attendees =
    attendeeNames.length > 0 ? attendeeNames.join(', ') : '기록 없음';

  return [
    MEETING_INFO_HEADER_PREFIX,
    `- **일시:** ${formatKst(startedAt)}`,
    `- **진행자:** ${hostName}`,
    `- **참석자:** ${attendees}`,
    '',
    '---',
  ].join('\n');
}

/*
 * content_md 를 '회의 정보' 헤더와 본문으로 분리한다.
 * 헤더(buildMeetingInfoHeader 생성물)는 '---' 구분선으로 끝나므로 그 지점에서 자른다.
 * 헤더가 없으면(수동 회의록 등) header=null, body=원본 전체.
 *  → 다듬기 시 본문만 AI 에 넘기고 헤더는 그대로 보존하는 데 사용.
 */
export function splitMeetingInfoHeader(contentMd: string): {
  header: string | null;
  body: string;
} {
  if (!contentMd.startsWith(MEETING_INFO_HEADER_PREFIX)) {
    return { header: null, body: contentMd };
  }

  const separator = '\n---';
  const sepIndex = contentMd.indexOf(separator);
  if (sepIndex === -1) {
    return { header: null, body: contentMd };
  }

  const headerEnd = sepIndex + separator.length;
  const header = contentMd.slice(0, headerEnd);
  // 헤더 뒤에 오는 빈 줄/공백을 제거한 나머지가 본문
  const body = contentMd.slice(headerEnd).replace(/^\s+/, '');

  return { header, body };
}
