'use client';

import { cn } from '@/lib/cn';
import { Modal } from '@heroui/react';

import ApproveReviewTab from './ApproveReviewTab';
import MergeReviewTab from './MergeReviewTab';
import type { PullRequestModalData, PullRequestReviewKind } from './types';

const REVIEW_KIND_OPTIONS = [
  {
    id: 'mine',
    label: '내 PR',
    description: '머지',
  },
  {
    id: 'team',
    label: '팀원 PR',
    description: '승인',
  },
] as const satisfies readonly {
  id: PullRequestReviewKind;
  label: string;
  description: string;
}[];

interface PullRequestModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pullRequest: PullRequestModalData | null;
}

export default function PullRequestModal({
  isOpen,
  onOpenChange,
  pullRequest,
}: PullRequestModalProps) {
  if (pullRequest === null) {
    return null;
  }

  const closeModal = () => onOpenChange(false);
  const reviewKind = pullRequest.reviewKind;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="fixed inset-0 z-50 flex animate-todak-fade-in items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
        <Modal.Container className="w-full max-w-md outline-none">
          <Modal.Dialog className="w-full space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl outline-none">
            <Modal.Header className="flex items-center justify-between border-b border-gray-100 pb-3">
              <Modal.Heading className="font-todak-mono text-xs font-bold text-todak-coral-500">
                GitHub Pull Request
              </Modal.Heading>
              <Modal.CloseTrigger className="rounded text-base font-bold text-gray-400 transition-colors hover:text-black focus:outline-none">
                ×
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="space-y-4 p-0">
              <section className="space-y-2">
                <h2 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-800">
                  <span className="text-todak-coral-500">
                    #{pullRequest.id}
                  </span>
                  <span className="truncate">{pullRequest.title}</span>
                </h2>

                <div className="flex justify-between rounded-lg bg-slate-50 p-3 font-todak-mono text-xs text-slate-500">
                  <span>
                    Author:{' '}
                    <strong className="font-todak-sans text-slate-600">
                      {pullRequest.author}
                    </strong>
                  </span>
                  <span>
                    Diff:{' '}
                    <strong className="text-emerald-600">
                      +{pullRequest.additions}/-{pullRequest.deletions}
                    </strong>
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  🔗 PR 원본 링크:{' '}
                  <a
                    className="font-todak-mono text-todak-coral-500 underline transition-colors hover:text-todak-coral-600"
                    href={pullRequest.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {pullRequest.url}
                  </a>
                </p>
              </section>

              <section className="space-y-2 rounded-xl border border-gray-200 bg-slate-50 p-3.5">
                <p className="block text-[10px] font-bold text-slate-400 uppercase">
                  PR 상태에 따른 고정 액션
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {REVIEW_KIND_OPTIONS.map(option => (
                    <button
                      aria-pressed={reviewKind === option.id}
                      className={cn(
                        'cursor-default rounded border py-1 text-xs font-bold transition-all',
                        reviewKind === option.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-gray-200 bg-white text-slate-400',
                      )}
                      key={option.id}
                      type="button"
                    >
                      {option.label}
                      <span className="ml-1 font-todak-mono text-[10px] opacity-70">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {reviewKind === 'mine' && <MergeReviewTab onClose={closeModal} />}
              {reviewKind === 'team' && (
                <ApproveReviewTab onClose={closeModal} />
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export type { PullRequestModalData };
