'use client';

import { useState } from 'react';
import { Button } from '@heroui/react';
import type { ActionItem } from '@/services/minutes/model';

const LABEL_OPTIONS = ['feat', 'bug', 'docs', 'refactor', 'enhancement'];

interface Props {
  issues: ActionItem[];
  onClose: () => void;
  onUpload: (editedIssues: ActionItem[]) => void;
}

export default function ReviewModal({ issues, onClose, onUpload }: Props) {
  const [editedIssues, setEditedIssues] = useState<ActionItem[]>(issues);

  const updateIssue = (idx: number, field: keyof ActionItem, value: string) => {
    setEditedIssues(prev =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-none">
      <div className="flex max-h-[80vh] w-[580px] flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-sm font-black text-slate-800">
              GitHub 이슈 검토 및 사양 조율
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              발행 예정인 개별 백로그의 세부 담당자 및 라벨 태그를 개인
              맞춤화합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mx-4 mt-3 shrink-0 flex items-center justify-between rounded-xl border border-todak-coral-200 bg-todak-coral-50 px-4 py-2.5">
          <p className="text-xs font-bold text-todak-coral-500">
            🚀 총 {issues.length}개의 선택된 이슈를 최종 수정 및 발행합니다.
          </p>
          <span className="rounded-full bg-todak-coral-500 px-2 py-0.5 text-[10px] font-bold text-white">
            REVIEWING
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-4">
          {editedIssues.map((issue, idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-todak-coral-400">
                  #AI_BACKLOG_ISSUE_{String(idx + 101)}
                </span>
                <span className="text-[10px] text-slate-400">
                  이슈 후보 {idx + 1}
                </span>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500">
                  이슈 제목 (Title)
                </label>
                <input
                  value={issue.title}
                  onChange={e => updateIssue(idx, 'title', e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-xs text-slate-700 focus:border-todak-coral-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-500">
                    👤 담당 배정 (Assignee)
                  </label>
                  <input
                    value={issue.assignee?.github_username ?? '미배정'}
                    readOnly
                    className="w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-500">
                    🏷️ 기능 라벨 (Label)
                  </label>
                  <select
                    value={issue.labels[0] ?? ''}
                    onChange={e => updateIssue(idx, 'labels', e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-xs text-slate-700 focus:border-todak-coral-500 focus:outline-none"
                  >
                    {LABEL_OPTIONS.map(l => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500">
                  이슈 본문 내용 (Markdown)
                </label>
                <textarea
                  value={issue.body ?? ''}
                  onChange={e => updateIssue(idx, 'body', e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border px-3 py-2 text-xs text-slate-700 focus:border-todak-coral-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4">
          <p className="text-[10px] text-slate-400">
            선택 확인 후 깃허브 원저 백로그에 실시간 전송을 수행합니다.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              이전 단계
            </Button>
            <Button
              variant="ghost"
              onClick={() => onUpload(editedIssues)}
              className="rounded-xl bg-todak-coral-500 px-4 py-2 text-xs font-bold text-white hover:bg-todak-coral-600"
            >
              github 업로드
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
