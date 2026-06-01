import type { PullRequestReviewTabProps } from './types';

export default function ApproveReviewTab({
  onClose,
}: PullRequestReviewTabProps) {
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
          className="flex-1 rounded-lg bg-indigo-500 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-600 focus:outline-none"
          type="button"
        >
          💬 Approve / Comment
        </button>
      </div>
    </>
  );
}

function ReviewNotice() {
  return (
    <p className="rounded-xl border border-todak-coral-100 bg-todak-coral-50/50 p-3 text-xs leading-relaxed text-gray-500">
      💡 <strong className="text-slate-600">리뷰 대기 상태</strong>: 팀원 PR의
      변경 사항을 확인하고 승인 또는 코멘트를 남겨주세요. 승인 결과는 GitHub
      리뷰 상태에 반영됩니다.
    </p>
  );
}
