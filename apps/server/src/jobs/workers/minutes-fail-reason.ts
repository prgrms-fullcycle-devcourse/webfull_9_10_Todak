export type MinutesFailReason =
  | 'MINUTES_NO_CHAT_LOG'
  | 'MEETING_NOT_FOUND'
  | 'GENERATION_ERROR';

/*
 * 회의록 생성 워커의 실패 에러를 클라이언트에 전달할 사유 코드로 분류한다.
 * 알려진 UnrecoverableError 사유(대화 없음 / 회의 없음)만 그대로 노출하고,
 * 그 외(일시적 AI·네트워크 오류 등)는 일반 코드로 보낸다(내부 에러 메시지 비노출).
 */
export function classifyMinutesFailReason(err: Error): MinutesFailReason {
  if (
    err.name === 'UnrecoverableError' &&
    (err.message === 'MINUTES_NO_CHAT_LOG' ||
      err.message === 'MEETING_NOT_FOUND')
  ) {
    return err.message;
  }

  return 'GENERATION_ERROR';
}
