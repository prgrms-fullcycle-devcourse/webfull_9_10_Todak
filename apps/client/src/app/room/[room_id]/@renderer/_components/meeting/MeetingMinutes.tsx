'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Tabs } from '@heroui/react';
import dynamic from 'next/dynamic';
import { useSpaceStore } from '@/store/useSpaceStore';
import { MinuteDetail } from '@/services/minutes/model';
import { refineMinutes } from '@/services/minutes/api';

interface MeetingMinutesProps {
  minutes: MinuteDetail | undefined;
  isLoading: boolean;
  content: string;
  generationError: string | null;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false },
);

export default function MeetingMinutes({
  minutes,
  isLoading,
  content,
  generationError,
  onContentChange,
  onSave,
}: MeetingMinutesProps) {
  const params = useParams();
  const roomId = params.room_id as string;
  const currentMinutesId = useSpaceStore(state => state.currentMinutesId);

  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );
  const [refineStatus, setRefineStatus] = useState<'idle' | 'loading'>('idle');
  const [refineError, setRefineError] = useState<string | null>(null);

  const handleSaveClick = async () => {
    setSaveStatus('saving');
    await onSave();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // AI 다듬기 공통 핸들러
  const handleRefine = async (
    refine_type: 'SHORTEN' | 'BULLET' | 'CUSTOM',
    custom_message?: string,
  ) => {
    if (!currentMinutesId || !roomId) return;
    if (refineStatus === 'loading') return;

    setRefineStatus('loading');
    setRefineError(null);

    try {
      const result = await refineMinutes(roomId, currentMinutesId, {
        refine_type,
        custom_message,
      });
      // DB 저장 안 함 → 로컬만 업데이트, 유저가 저장 버튼으로 확정
      onContentChange(result.refined_content_md);
      setShowCustomInput(false);
      setCustomPrompt('');
    } catch (e: unknown) {
      const code = (e as { response?: { data?: { code?: string } } })?.response
        ?.data?.code;
      if (code === 'MINUTES_GENERATING') {
        setRefineError(
          'AI가 회의록을 생성 중입니다. 완료 후 다시 시도해주세요',
        );
      } else if (code === 'TOO_MANY_REQUESTS') {
        setRefineError(
          'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요',
        );
      } else if (code === 'MINUTES_NO_CONTENT') {
        setRefineError('회의록 내용이 없습니다');
      } else {
        setRefineError('AI 다듬기에 실패했습니다. 다시 시도해주세요');
      }
    } finally {
      setRefineStatus('idle');
    }
  };

  // 회의록 없을 때
  if (!currentMinutesId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-400">
        회의를 종료하면 AI 회의록이 생성됩니다
      </div>
    );
  }

  // 로딩 중 / AI 생성 중 / 서버 데이터 준비 전
  if (isLoading || minutes?.status === 'generating') {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
        {generationError ? (
          <>
            <span className="text-2xl">⚠️</span>
            <p className="text-xs text-red-400">{generationError}</p>
          </>
        ) : (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-todak-coral-500 border-t-transparent" />
            <p className="text-xs text-slate-400">
              AI가 회의록을 생성하고 있어요...
            </p>
            <p className="text-[10px] text-slate-300">
              완료되면 실시간으로 알림이 전송됩니다
            </p>
          </>
        )}
      </div>
    );
  }

  const createdDate = minutes
    ? new Date(minutes.created_at)
        .toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
        .replace('. ', '/')
        .replace('.', '')
    : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 상단 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🗒️</span>
            <span className="text-sm font-black text-slate-800">
              {minutes?.title}
            </span>
            <span className="text-[10px] text-slate-400">{createdDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-todak-coral-200 bg-todak-coral-50 px-2 py-0.5 text-[10px] font-bold text-todak-coral-500">
            AI 요약 활성됨
          </span>
          <button
            onClick={handleSaveClick}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            {saveStatus === 'saving'
              ? '저장 중...'
              : saveStatus === 'saved'
                ? '✓ 저장됨'
                : '저장'}
          </button>
        </div>
      </div>

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
            onChange={val => onContentChange(val ?? '')}
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
            onClick={() => handleRefine('SHORTEN')}
            isDisabled={refineStatus === 'loading'}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {refineStatus === 'loading' ? '⏳' : '✂️'} 더 짧게
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleRefine('BULLET')}
            isDisabled={refineStatus === 'loading'}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {refineStatus === 'loading' ? '⏳' : '📋'} 개조식으로
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

        {/* AI 다듬기 에러 */}
        {refineError && (
          <p className="mt-1.5 text-[10px] text-red-400">{refineError}</p>
        )}

        {/* 커스텀 입력 */}
        {showCustomInput && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && customPrompt.trim()) {
                  handleRefine('CUSTOM', customPrompt.trim());
                }
              }}
              placeholder="AI에게 요청할 내용을 입력하세요..."
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-todak-coral-500 focus:outline-none"
            />
            <Button
              variant="ghost"
              onClick={() => {
                if (customPrompt.trim())
                  handleRefine('CUSTOM', customPrompt.trim());
              }}
              isDisabled={!customPrompt.trim() || refineStatus === 'loading'}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
            >
              {refineStatus === 'loading' ? '처리 중...' : '요청'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
