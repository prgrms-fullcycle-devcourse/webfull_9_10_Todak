'use client';

import { Card, Tabs } from '@heroui/react';

import CreateTab from './CreateTab';
import InviteTab from './InviteTab';

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

interface ProjectHubProps {
  userID: string;
}

export default function ProjectHub({ userID }: ProjectHubProps) {
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
                  <CreateTab userID={userID} />
                ) : (
                  <InviteTab userID={userID} />
                )}
              </Tabs.Panel>
            ))}
          </Tabs>
        </Card.Content>
      </Card>
    </section>
  );
}
