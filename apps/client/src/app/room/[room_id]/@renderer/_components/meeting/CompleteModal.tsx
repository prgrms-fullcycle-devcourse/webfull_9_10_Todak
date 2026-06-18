'use client';

import type { ActionItem } from '@/services/minutes/model';

interface Props {
  issues: ActionItem[];
  onClose: () => void;
}

export default function CompleteModal({ issues, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-none">
      <div className="w-[520px] rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-green-400 bg-green-50">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
        <h2 className="mb-1 text-center text-base font-black text-slate-800">
          GitHub 이슈 발행 연동 완료
        </h2>
        <p className="mb-6 text-center text-[11px] text-slate-400">
          조율 및 컨펌이 완료된 백로그가 연동된 레포지토리의 이슈 보드에
          등록되었습니다!
        </p>
        <div className="mb-4 space-y-2">
          {issues.map((issue, idx) => (
            <div key={idx} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-todak-coral-400">
                  #ISSUE_{String(idx + 101)}
                </span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">
                  Open
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-800">
                {issue.title}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {issue.assignee && (
                  <span className="text-[10px] text-slate-400">
                    담당: @{issue.assignee.github_username}
                  </span>
                )}
                {issue.labels.map(label => (
                  <span
                    key={label}
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-5 rounded-xl border border-todak-coral-100 bg-todak-coral-50 px-4 py-3">
          <p className="text-[11px] text-slate-600">
            🦉 이슈 업로드 완료!
            <br />
            이슈 일괄 등록으로 팀의 백로그를 빠르게 정리 완료했어요! 이제
            팀원들과 다시 가상 타운으로 이동하여 개발에만 집중해 볼까요? 🚀
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          완료
        </button>
      </div>
    </div>
  );
}
