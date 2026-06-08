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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="fixed inset-0 z-50 flex animate-todak-fade-in items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
        <Modal.Container className="w-full max-w-md outline-none">
          <Modal.Dialog className="w-full space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl outline-none">
            <Modal.Header className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <Modal.Heading className="text-sm font-black text-slate-800">
                  GitHub Pull Request
                </Modal.Heading>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {
                    'PR \uB0B4\uC6A9\uC744 \uD655\uC778\uD55C \uB4A4 GitHub\uC5D0\uC11C \uC774\uC5B4\uC11C \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.'
                  }
                </p>
              </div>
              <Modal.CloseTrigger>&times;</Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="space-y-4 p-0">
              <section className="space-y-3">
                <h2 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-800">
                  <span className="text-todak-coral-500">
                    #{pullRequest.id}
                  </span>
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
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export type { PullRequestModalData };
