'use client';

import { Button, Card, Chip, Input, Tabs } from '@heroui/react';
import Link from 'next/link';

const TabOptions = [
  {
    id: 'create',
    label: '새 프로젝트 생성',
    icon: '+',
  },
  {
    id: 'invite',
    label: '초대 코드로 참여',
    icon: '🔑',
  },
];

const teamList = [
  {
    repoName: '토닥윗미 웹 앱 개발단',
    url: 'team/todak-with-me',
    id: 'TODAK-992F',
  },
  {
    repoName: '소켓 통신 프로토콜 스파이크팀',
    url: 'team/socket-spike',
    id: 'TODAK-881A',
  },
];

export default function ProjectHub() {
  return (
    <section className="flex min-h-dvh w-full items-start justify-center bg-background px-5 pb-8 pt-[max(2rem,calc((100dvh-494px)/2))]">
      <Card className="w-full max-w-[386px] gap-0 rounded-[26px] border border-border/80 bg-surface px-7 py-8 shadow-todak-panel">
        <Card.Header className="items-center gap-2 text-center">
          <p className="todak-section-label text-todak-coral-500">
            PROJECT HUB
          </p>
          <Card.Title className="todak-title text-[21px] leading-tight sm:text-[23px]">
            협업할 프로젝트 팀 연결
          </Card.Title>
          <Card.Description className="todak-subcopy text-[10px] font-bold sm:text-[11px]">
            새로운 스터디룸을 생성하거나 초대 코드를 통해 기존 룸에 진입합니다
          </Card.Description>
        </Card.Header>
        <Card.Content className="mt-5 gap-0">
          <Tabs defaultSelectedKey="create" className="gap-0">
            <Tabs.ListContainer className="mb-5">
              <Tabs.List className="w-full overflow-hidden rounded-xl border border-border bg-background p-0 shadow-sm">
                {TabOptions.map(option => (
                  <Tabs.Tab
                    className="h-9 rounded-none px-2 text-[11px] font-black text-slate-500 transition-colors first:rounded-l-[11px] last:rounded-r-[11px] data-[selected=true]:bg-slate-900 data-[selected=true]:text-white"
                    key={`team-selection-tabs-${option.id}`}
                    id={option.id}
                  >
                    <span className="flex min-w-0 items-center justify-center gap-1.5">
                      <span aria-hidden="true">{option.icon}</span>
                      <span className="truncate">{option.label}</span>
                    </span>
                    <Tabs.Indicator className="hidden" />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
            {TabOptions.map(option => (
              <Tabs.Panel
                className="mt-0 p-0 outline-none"
                key={`team-selection-tabs-panel-${option.id}`}
                id={option.id}
              >
                {option.id === 'create' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label
                        className="block text-xs font-black text-slate-700"
                        htmlFor="github-repository-url"
                      >
                        GitHub 레포지토리 연결
                      </label>
                      <Input
                        aria-label="GitHub 레포지토리 URL"
                        className="h-9 rounded-xl border border-border bg-surface px-3.5 py-0 text-xs font-semibold text-slate-700 shadow-field placeholder:text-slate-400 focus:border-accent"
                        defaultValue="https://github.com/team/todak-with-me"
                        fullWidth
                        id="github-repository-url"
                        placeholder="레포지토리 URL을 입력하세요"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-slate-400">
                        연결 가능한 기존 팀 리스트
                      </p>
                      <div className="space-y-2">
                        {teamList.map(team => (
                          <Link
                            className="group flex min-h-[50px] items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-sm transition-colors hover:border-todak-coral-200 hover:bg-todak-coral-50/60"
                            key={`existing-team-list-${team.id}`}
                            href={`/room/${team.id}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-black text-slate-800">
                                {team.repoName}
                              </span>
                              <span className="todak-mono mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                                {team.url}
                              </span>
                            </span>
                            <Chip
                              className="rounded-md bg-slate-100 px-2 py-0 text-[10px] font-black text-slate-400"
                              color="default"
                              size="sm"
                              variant="soft"
                            >
                              {team.id}
                            </Chip>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="mt-1 h-9 rounded-xl bg-accent text-xs font-black text-accent-foreground shadow-md hover:bg-accent-hover"
                      fullWidth
                      type="button"
                      variant="primary"
                    >
                      다음 단계로 이동 (프로필 설정)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-700">
                      팀 초대 코드 입력
                    </p>
                    <Input
                      className="h-9 rounded-xl border border-border bg-surface px-3.5 py-0 text-xs font-semibold text-slate-700 shadow-field placeholder:text-slate-400"
                      fullWidth
                      placeholder="12자리 초대 코드를 입력하세요"
                    />
                    <Button
                      className="h-9 rounded-xl bg-accent text-xs font-black text-accent-foreground shadow-md hover:bg-accent-hover"
                      fullWidth
                      type="button"
                      variant="primary"
                    >
                      다음 단계로 이동 (프로필 설정)
                    </Button>
                  </div>
                )}
              </Tabs.Panel>
            ))}
          </Tabs>
        </Card.Content>
      </Card>
    </section>
  );
}
