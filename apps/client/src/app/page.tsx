'use client';

import { Button, Card, Chip } from '@heroui/react';

import {
  TodakBody,
  TodakFooter,
  TodakHeader,
  TodakHeading,
  TodakModal,
  useTodakModal,
} from '@/components/todak';

const themeTokens = [
  { label: 'Accent', value: 'var(--accent)', className: 'bg-accent' },
  { label: 'Surface', value: 'var(--surface)', className: 'bg-surface' },
  { label: 'Overlay', value: 'var(--overlay)', className: 'bg-overlay' },
  { label: 'Border', value: 'var(--border)', className: 'bg-border' },
];

const sampleIssues = [
  '회의록 요약본 저장 플로우 정리',
  'GitHub 이슈 검토 모달 세부 라벨 연결',
  '2D 타운 채팅 패널 접근성 점검',
];

export default function Home() {
  const modal = useTodakModal();

  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-3xl border border-separator bg-surface p-6 shadow-surface md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <Chip color="accent" size="sm" variant="soft">
              data-theme=&quot;todak&quot;
            </Chip>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-normal text-foreground md:text-5xl">
                Todak HeroUI Theme Sample
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted">
                HeroUI의 semantic token을 Todak 테마로 매핑한 샘플 페이지입니다.
                primary 버튼은 coral accent를, secondary 버튼은 Todak neutral
                surface를 사용합니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onPress={modal.open} variant="primary">
              모달 열기
            </Button>
            <Button variant="secondary">보조 액션</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <Card variant="default">
            <Card.Header>
              <div className="space-y-1">
                <Card.Title>Todak Modal Preview</Card.Title>
                <Card.Description>
                  와이어프레임의 모달 톤을 HeroUI wrapper와 전역 토큰으로
                  재현합니다.
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="rounded-2xl border border-separator bg-overlay p-5 shadow-overlay">
                <div className="flex items-start justify-between gap-4 border-b border-separator bg-surface-secondary px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-accent uppercase">
                      Github Issue Hub
                    </p>
                    <h2 className="mt-1 text-sm font-black text-foreground">
                      이슈 검토 및 사양 조율
                    </h2>
                  </div>
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black text-accent-soft-foreground">
                    3개 선택됨
                  </span>
                </div>

                <div className="space-y-2 px-5 py-5">
                  {sampleIssues.map(issue => (
                    <div
                      className="rounded-xl border border-separator bg-surface p-3 text-xs font-bold text-foreground"
                      key={issue}
                    >
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            </Card.Content>
            <Card.Footer>
              <Button onPress={modal.open} size="sm" variant="primary">
                실제 모달 확인
              </Button>
            </Card.Footer>
          </Card>

          <Card variant="secondary">
            <Card.Header>
              <div className="space-y-1">
                <Card.Title>Theme Tokens</Card.Title>
                <Card.Description>
                  HeroUI가 읽는 전역 CSS variables입니다.
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {themeTokens.map(token => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-separator bg-surface px-3 py-2"
                    key={token.label}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-5 rounded-full border border-separator ${token.className}`}
                      />
                      <span className="text-xs font-black text-foreground">
                        {token.label}
                      </span>
                    </div>
                    <code className="font-todak-mono text-[10px] text-muted">
                      {token.value}
                    </code>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      </section>

      <TodakModal state={modal}>
        <TodakHeader>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-accent uppercase">
              Todak Modal
            </p>
            <TodakHeading>HeroUI wrapper 모달 샘플</TodakHeading>
          </div>
        </TodakHeader>
        <TodakBody>
          <p>
            이 모달은 HeroUI Portal과 overlay state를 그대로 사용하면서, 전역
            Todak 테마 토큰을 통해 배경, 테두리, accent, shadow를 적용합니다.
          </p>
          <div className="rounded-xl border border-separator bg-surface-secondary p-3">
            <p className="text-xs font-bold text-foreground">
              primary = Todak coral, secondary = Todak neutral
            </p>
          </div>
        </TodakBody>
        <TodakFooter>
          <Button onPress={modal.close} variant="secondary">
            닫기
          </Button>
          <Button onPress={modal.close} variant="primary">
            확인
          </Button>
        </TodakFooter>
      </TodakModal>
    </main>
  );
}
