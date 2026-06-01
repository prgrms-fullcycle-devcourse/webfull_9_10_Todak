import type { PullRequestReviewTabProps } from './types';

export default function MergeReviewTab({ onClose }: PullRequestReviewTabProps) {
  return (
    <>
      <ReviewNotice />
      <div className="flex gap-2.5">
        <button
          className="flex-1 rounded-lg bg-gray-100 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-gray-200 focus:outline-none"
          onClick={onClose}
          type="button"
        >
          창 닫기
        </button>
        <button
          className="flex-1 rounded-lg bg-todak-coral-500 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-todak-coral-600 focus:outline-none"
          type="button"
        >
          ⚡ 머지하기
        </button>
      </div>
    </>
  );
}

function ReviewNotice() {
  return (
    <p className="rounded-xl border border-todak-coral-100 bg-todak-coral-50/50 p-3 text-xs leading-relaxed text-gray-500">
      💡 <strong className="text-slate-600">머지 가능 상태</strong>: 내 PR의
      코드가 정상 작동하며 머지를 기다리고 있습니다. 머지 시 가상 협업 타운의
      Review Station 보드에서 자동 제거됩니다.
    </p>
  );
}
