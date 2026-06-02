'use client';

import { useState } from 'react';

import CompleteModal from './CompleteModal';
import ReviewModal from './ReviewModal';

interface Issue {
  id: string;
  title: string;
  assignee: string;
  date: string;
  label: 'FEAT' | 'BUG' | 'DOCS' | 'REFACTOR';
}

const LABEL_COLORS = {
  FEAT: 'bg-green-100 text-green-600',
  BUG: 'bg-red-100 text-red-500',
  DOCS: 'bg-blue-100 text-blue-500',
  REFACTOR: 'bg-purple-100 text-purple-500',
};

const MOCK_ISSUES: Issue[] = [
  {
    id: '1',
    title: '미팅룸 진입 감지 및 ZEP식 private 소켓 채널링 구현',
    assignee: '@지윤',
    date: '오늘',
    label: 'FEAT',
  },
  {
    id: '2',
    title: 'MDX Editor 기반 회의록 수정 숏컷 인터페이스 개발',
    assignee: '@수아',
    date: '오늘',
    label: 'DOCS',
  },
  {
    id: '3',
    title: 'GitHub API 연동 일괄 이슈 발행 및 알림 토스트 연동',
    assignee: '@민호',
    date: '오늘',
    label: 'BUG',
  },
  {
    id: '4',
    title: '이슈 발행 영수증 컴포넌트 마크업 고도화',
    assignee: '@현우',
    date: '오늘',
    label: 'REFACTOR',
  },
];

export default function IssueHub() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'none' | 'review' | 'complete'>('none');

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-surface">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-todak-coral-500">
            GITHUB ISSUE
          </p>
          <p className="text-xs font-black text-slate-800">
            GitHub 이슈 등록기
          </p>
        </div>
        {selected.size > 0 && (
          <span className="rounded-full bg-todak-coral-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {selected.size}개 선택됨
          </span>
        )}
      </div>

      {/* 이슈 카드 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
        {MOCK_ISSUES.map(issue => (
          <div
            key={issue.id}
            onClick={() => toggleSelect(issue.id)}
            className={`cursor-pointer rounded-xl border p-3 transition-colors ${
              selected.has(issue.id)
                ? 'border-todak-coral-200 bg-todak-coral-50'
                : 'border-border bg-surface hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="mb-1 text-[10px] font-bold text-todak-coral-400">
                  NEW ISSUE
                </p>
                <p className="text-xs font-bold leading-snug text-slate-800">
                  {issue.title}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">
                    {issue.assignee}
                  </span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] text-slate-400">
                    {issue.date}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${LABEL_COLORS[issue.label]}`}
                  >
                    {issue.label}
                  </span>
                </div>
              </div>
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  selected.has(issue.id)
                    ? 'border-todak-coral-500 bg-todak-coral-500'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selected.has(issue.id) && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 버튼 */}
      <div className="shrink-0 border-t border-border p-3">
        <button
          onClick={() => setModal('review')}
          disabled={selected.size === 0}
          className="w-full rounded-xl bg-todak-coral-500 py-3 text-xs font-black text-white transition-all hover:bg-todak-coral-600 disabled:opacity-40"
        >
          이슈 검토 ({selected.size}개)
        </button>
      </div>

      {modal === 'review' && (
        <ReviewModal
          issues={MOCK_ISSUES}
          selected={selected}
          onClose={() => setModal('none')}
          onUpload={() => setModal('complete')}
        />
      )}
      {modal === 'complete' && (
        <CompleteModal
          issues={MOCK_ISSUES}
          selected={selected}
          onClose={() => setModal('none')}
        />
      )}
    </div>
  );
}
