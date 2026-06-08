'use client';

import { Modal } from '@heroui/react';

import type { PullRequestModalData } from './types';

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
  const statusText = pullRequest.isDraft ? 'Draft' : pullRequest.state;
  const assigneeText =
    pullRequest.assignees.length > 0
      ? pullRequest.assignees.join(', ')
      : '\uBBF8\uC9C0\uC815';
  const labelText =
    pullRequest.labels.length > 0
      ? pullRequest.labels.join(', ')
      : '\uB77C\uBCA8 \uC5C6\uC74C';

  return (
    <Modal isOpen={isOpen} onOpenChange={closeModal}>
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
        <div className="absolute inset-0" onClick={closeModal} />

        <div className="pointer-events-auto relative z-10 mx-auto my-auto max-h-[95vh] w-full max-w-md overflow-y-auto rounded-[26px] border border-slate-100 bg-white px-5 py-5 shadow-xl focus:outline-none">
          <button
            aria-label="모달 닫기"
            className="absolute right-6 top-5 z-50 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
            onClick={closeModal}
            type="button"
          >
            &times;
          </button>

          <Modal.Header className="px-0 pb-3 pt-3">
            <h3 className="flex items-center gap-1.5 text-[16px] font-black text-slate-800">
              GitHub Pull Request
            </h3>
          </Modal.Header>

          <Modal.Body className="flex max-w-110 flex-col gap-4 px-0">
            <section className="space-y-3">
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-800">
                <span className="text-todak-coral-500">#{pullRequest.id}</span>
                <span className="truncate">{pullRequest.title}</span>
              </h2>

              <div className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 font-todak-mono text-xs text-slate-500">
                <span>
                  Author:{' '}
                  <strong className="font-todak-sans text-slate-600">
                    {pullRequest.author}
                  </strong>
                </span>
                <span className="min-w-0 truncate">
                  Branch:{' '}
                  <strong className="text-emerald-600">
                    {pullRequest.branch.head} -&gt; {pullRequest.branch.base}
                  </strong>
                </span>
              </div>

              <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-black uppercase tracking-normal text-slate-400">
                  PR Summary
                </p>
                <p className="text-xs leading-relaxed text-slate-600">
                  <strong className="text-slate-800">
                    {pullRequest.branch.head}
                  </strong>
                  {'\uC5D0\uC11C '}
                  <strong className="text-slate-800">
                    {pullRequest.branch.base}
                  </strong>
                  {'\uB85C \uBCD1\uD569\uD558\uB294 PR\uC785\uB2C8\uB2E4. '}
                  <span className="font-bold text-todak-coral-500">
                    {statusText}
                  </span>
                  {' \uC0C1\uD0DC\uC774\uBA70, '}
                  {pullRequest.updatedAt}
                  {
                    '\uC5D0 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.'
                  }
                </p>
                <div className="grid gap-2 text-[11px] font-bold text-slate-500 sm:grid-cols-2">
                  <div className="rounded-md bg-slate-50 px-2.5 py-2">
                    <span className="block text-slate-400">
                      {'\uB2F4\uB2F9\uC790'}
                    </span>
                    <span className="text-slate-700">{assigneeText}</span>
                  </div>
                  <div className="rounded-md bg-slate-50 px-2.5 py-2">
                    <span className="block text-slate-400">
                      {'\uB77C\uBCA8'}
                    </span>
                    <span className="text-slate-700">{labelText}</span>
                  </div>
                </div>
              </section>

              <a
                className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-todak-coral-500 focus:outline-none focus:ring-2 focus:ring-todak-coral-300"
                href={pullRequest.url}
                rel="noreferrer"
                target="_blank"
              >
                {'GitHub\uC5D0\uC11C \uD655\uC778\uD558\uAE30'}
              </a>
            </section>
          </Modal.Body>
        </div>
      </div>
    </Modal>
  );
}

export type { PullRequestModalData };
