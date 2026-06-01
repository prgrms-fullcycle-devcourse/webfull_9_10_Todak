'use client';

import { useState } from 'react';
import { Button, Tabs } from '@heroui/react';
import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false },
);

// API 응답 타입
interface MeetingMinutesData {
  id: string;
  room_id: string;
  meeting_id: string;
  author_id: string;
  title: string;
  type: string;
  content_md: string | null;
  status: 'generating' | 'completed' | 'failed';
  linked_issue_numbers: number[];
  created_at: string;
  updated_at: string;
}

// 목업 데이터 (API 연결 전)
const MOCK_MINUTES: MeetingMinutesData = {
  id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  room_id: 'rooms_uuid_1234',
  meeting_id: 'm1e2e3t4-i5n6-7g8b-9c0d-1e2f3a4b5c6d',
  author_id: 'user_uuid_5678',
  title: '채팅 컴포넌트 킥오프 요약',
  type: 'meeting',
  content_md: `## 🗒️ 회의록 요약: 회의실 B 세션

AI가 수집한 채팅 로그를 바탕으로 작성한 회의록입니다.

### 👥 회의 참석자
수정(나), 지윤, 수아, 민호

### 💬 수집된 회의 대화 요약
* **현우**: 미팅룸 B에서는 백엔드 REST API 명세 정리 회의 시작할게요.
* **민호**: 깃허브 이슈 자동 등록할 때 보낼 페이로드 설계가 필요합니다.

### 💡 AI 기반 추천 해결 과제
* 회의 대화록 상에서 나타난 병목 구간을 감지하여 GitHub 이슈로 추천합니다.
* 우측 체크박스를 선택하고 깃 이슈 일괄 등록하기 버튼을 클릭하면 즉시 발행됩니다.`,
  status: 'completed', // 'generating' 으로 바꾸면 로딩 상태 테스트 가능
  linked_issue_numbers: [],
  created_at: '2026-05-18T14:02:00.000Z',
  updated_at: '2026-05-18T14:32:00.000Z',
};

export default function MeetingMinutes() {
  const [minutes] = useState<MeetingMinutesData>(MOCK_MINUTES);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [content, setContent] = useState(MOCK_MINUTES.content_md ?? '');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const isGenerating = minutes.status === 'generating';

  // 날짜 포맷
  const createdDate = new Date(minutes.created_at)
    .toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
    })
    .replace('. ', '/')
    .replace('.', '');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 상단 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🗒️</span>
            <span className="text-sm font-black text-slate-800">
              {minutes.title}
            </span>
            <span className="text-[10px] text-slate-400">{createdDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-[10px] font-bold text-yellow-500">
              ⏳ AI 생성 중...
            </span>
          ) : (
            <span className="rounded-full border border-todak-coral-200 bg-todak-coral-50 px-2 py-0.5 text-[10px] font-bold text-todak-coral-500">
              AI 요약 활성됨
            </span>
          )}
          <button
            disabled={isGenerating}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </div>

      {/* 생성 중 로딩 */}
      {isGenerating ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-todak-coral-500 border-t-transparent" />
          <p className="text-xs text-slate-400">
            AI가 회의록을 생성하고 있어요...
          </p>
          <p className="text-[10px] text-slate-300">
            완료되면 실시간으로 알림이 전송됩니다
          </p>
        </div>
      ) : (
        <>
          {/* 탭 */}
          <div className="shrink-0 border-b border-border bg-surface">
            <Tabs
              selectedKey={tab}
              onSelectionChange={key => setTab(key as 'edit' | 'preview')}
            >
              <Tabs.ListContainer>
                <Tabs.List className="rounded-none border-none bg-surface p-0">
                  {[
                    { id: 'edit', label: '편집 (마크다운)' },
                    { id: 'preview', label: '미리보기' },
                  ].map(t => (
                    <Tabs.Tab
                      key={t.id}
                      id={t.id}
                      className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 data-[selected=true]:border-todak-coral-500 data-[selected=true]:text-todak-coral-500"
                    >
                      {t.label}
                      <Tabs.Indicator className="hidden" />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>

          {/* 본문 */}
          <div
            className="min-h-0 flex-1 overflow-y-auto p-4"
            data-color-mode="light"
          >
            {tab === 'edit' ? (
              <MDEditor
                value={content}
                onChange={val => setContent(val ?? '')}
                height="100%"
                preview="edit"
                className="min-h-[400px]"
              />
            ) : (
              <MDPreview
                source={content}
                className="rounded-xl border border-border bg-surface p-4"
              />
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="shrink-0 border-t border-border bg-surface px-6 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {/* TODO: API 연결 시 refine_type: SHORTEN 요청 */}
                ✂️ 더 짧게
              </Button>
              <Button
                variant="ghost"
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {/* TODO: API 연결 시 refine_type: BULLET 요청 */}
                📋 개조식으로
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCustomInput(prev => !prev)}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ✏️ 직접 입력
              </Button>
              <span className="ml-auto text-[10px] text-slate-400">
                ✨ AI로 회의록 다듬기
              </span>
            </div>

            {/* 직접 입력창 */}
            {showCustomInput && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="AI에게 요청할 내용을 입력하세요..."
                  className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-todak-coral-500 focus:outline-none"
                />
                <Button
                  variant="ghost"
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-hover"
                >
                  {/* TODO: API 연결 시 refine_type: CUSTOM, custom_message: customPrompt 요청 */}
                  요청
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
