import Image from 'next/image';

export function UnsupportedDeviceScreen() {
  return (
    <aside
      aria-label="지원하지 않는 기기 안내"
      className="todak-unsupported-device"
    >
      <div className="flex w-full max-w-[360px] flex-col items-center px-7 text-center">
        <Image
          alt=""
          aria-hidden="true"
          className="mb-6 size-20 object-contain"
          height={80}
          src="/assets/todak-owl-logo.png"
          width={80}
        />
        <p className="mb-2 text-[11px] font-black tracking-[0.18em] text-todak-coral-500">
          DESKTOP ONLY
        </p>
        <h1 className="text-2xl leading-tight font-black text-todak-ink">
          아직 모바일과 태블릿은 지원하지 않아요
        </h1>
        <p className="mt-4 text-sm leading-6 font-bold text-todak-muted">
          토닥윗미는 넓은 화면에서 함께 작업하도록 만들어졌어요. 노트북이나
          데스크톱 브라우저로 접속해 주세요.
        </p>
      </div>
    </aside>
  );
}
