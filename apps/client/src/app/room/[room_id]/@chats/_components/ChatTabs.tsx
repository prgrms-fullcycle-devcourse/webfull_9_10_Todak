'use client';

import { Tabs } from '@heroui/react';
import { TabType } from '../page';

interface Props {
  tab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TAB_OPTIONS = [
  { id: 'all', label: '전체 채널' },
  { id: 'private', label: '프라이빗 룸 채널' },
];

export default function ChatTabs({ tab, onTabChange }: Props) {
  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <Tabs
        selectedKey={tab}
        onSelectionChange={key => onTabChange(key as TabType)}
      >
        <Tabs.ListContainer>
          <Tabs.List className="w-full rounded-none border-none bg-surface p-0">
            {TAB_OPTIONS.map(t => (
              <Tabs.Tab
                key={t.id}
                id={t.id}
                className="flex-1 rounded-none border-b-2 border-transparent py-4 text-xs font-bold text-slate-400 data-[selected=true]:border-todak-coral-500 data-[selected=true]:text-todak-coral-500"
              >
                {t.label}
                <Tabs.Indicator className="hidden" />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  );
}
