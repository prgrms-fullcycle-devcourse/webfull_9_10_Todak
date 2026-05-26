export default function HomeRight() {
  return (
    <div className="hidden md:block">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-todak-panel">
        <div className="text-6xl">🦉</div>
        <p className="mt-6 text-lg font-black text-foreground">
          오늘도 우리 같이 토닥토닥!
        </p>
        <div className="mt-6 rounded-2xl bg-surface-secondary p-5 text-left text-sm leading-7 text-muted">
          🌱{' '}
          <strong className="font-black text-foreground">
            실시간 드래그 협업 타운
          </strong>
          에서 나만의 이모지 상태를 드러내며 동료와 함께 자리하세요. 회의가
          끝나면 번거로운 절차 없이 바로 백로그로 이슈화됩니다.
        </div>
      </div>
    </div>
  );
}
