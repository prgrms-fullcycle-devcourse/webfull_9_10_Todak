'use client';

import { Button, Card, Chip, Input, Tabs } from '@heroui/react';
import Link from 'next/link';

const TabOptions = [
  {
    id: 'create',
    label: '새 프로젝트 생성',
  },
  {
    id: 'invite',
    label: '초대 코드로 참여',
  },
];

const teamList = [
  {
    repoName: '토닥윕미 웹 앱 개발단',
    url: 'team/todak-with-me',
    id: 'TODAK-992F',
  },
];

export default function ProjectHub() {
  return (
    <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-16 px-8 py-16 md:grid-cols-[1fr_0.95fr]">
      <Card>
        <Card.Title>
          <p>PROJECT HUB</p>
          <p>협업할 프로젝트 팀 연결</p>
          <p>
            새로운 스터디룸을 생성하거나 초대 코드를 통해 기존 룸에 진입합니다
          </p>
        </Card.Title>
        <Card.Content>
          <Tabs>
            <Tabs.ListContainer>
              <Tabs.List>
                {TabOptions.map(option => (
                  <Tabs.Tab
                    key={`team-selection-tabs-${option.id}`}
                    id={option.id}
                  >
                    <p>{option.label}</p>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
            {TabOptions.map(option => (
              <Tabs.Panel
                key={`team-selection-tabs-panel-${option.id}`}
                id={option.id}
              >
                <p>{option.label}</p>

                {option.id === 'create' ? (
                  <>
                    <p>GitHub 레포지토리 연결</p>
                    <Input
                      fullWidth
                      placeholder="레포지토리 URL을 입력하세요"
                    />
                    <p>연결 가능한 기존 팀 리스트</p>
                    {teamList.map(team => (
                      <Link
                        className="flex"
                        key={`existing-team-list-${team.id}`}
                        href=""
                      >
                        <span>
                          <p>{team.repoName}</p>
                          <p>{team.url}</p>
                        </span>
                        <span>
                          <Chip>{team.id}</Chip>
                        </span>
                      </Link>
                    ))}
                  </>
                ) : (
                  <>
                    <p>팀 초대 코드 입력</p>
                    <Input
                      fullWidth
                      placeholder="12자리 초대 코드를 입력하세요"
                    />
                    <Button>다음 단계로 이동 (프로필 설정)</Button>
                  </>
                )}
              </Tabs.Panel>
            ))}
          </Tabs>
        </Card.Content>
      </Card>
    </section>
  );
}
