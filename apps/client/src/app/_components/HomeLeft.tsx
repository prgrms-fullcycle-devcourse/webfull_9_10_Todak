'use client';

import { Link } from '@heroui/react';

function GithubIcon() {
  return (
    <svg aria-hidden="true" className="size-5 fill-current" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.6-2.67-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.8c1.02 0 2.05.14 3.01.4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}
export default function HomeLeft() {
  return (
    <div className="max-w-[460px]">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-black text-accent-foreground">
          토
        </span>
        <span className="text-lg font-black tracking-tight text-foreground">
          토닥윗미
        </span>
      </div>

      <h1 className="text-5xl font-black leading-[0.98] tracking-normal text-foreground md:text-6xl">
        개발자들을 위한
        <br />
        다정하고 똑똑한
        <br />
        <span className="text-accent underline decoration-accent decoration-wavy decoration-2 underline-offset-8">
          2D 가상 공간.
        </span>
      </h1>

      <p className="mt-7 text-sm font-medium leading-7 text-muted">
        딱딱한 협업 도구를 벗어나, 귀여운 캐릭터로 메아리치는 공간에서 함께
        집중하세요. 회의 대화 내용을 분석하여{' '}
        <strong className="font-black text-foreground">
          GitHub 마일스톤 이슈로 일괄 전환
        </strong>
        해 주는 AI 서포트 허브입니다.
      </p>

      <Link
        href="/join"
        className="mt-10 h-auto min-w-0 rounded-xl bg-foreground px-8 py-4 text-sm font-black text-background shadow-todak-soft"
      >
        <GithubIcon />
        GitHub 계정으로 시작하기
      </Link>
    </div>
  );
}
