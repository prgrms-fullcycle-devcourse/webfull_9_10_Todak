'use client';

import { Accordion } from '@heroui/react';

export default function AIGuide() {
  return (
    <Accordion.Item id="ai-guide">
      <Accordion.Heading>
        <Accordion.Trigger className="flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left">
          <span className="text-[11px] font-black tracking-tight text-accent">
            AI 가이드
          </span>
          <Accordion.Indicator className="size-3.5 text-accent" />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel className="pb-3">
        <p className="rounded-lg bg-accent/10 px-2.5 py-2 text-[11px] leading-5 text-foreground">
          캐릭터를 클릭하면 팀원의 To-Do와 내 프로필 수정을 한 곳에서 진행할 수
          있어요!
        </p>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
