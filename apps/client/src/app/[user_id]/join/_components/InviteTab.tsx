'use client';

import { Input, Label } from '@heroui/react';
import Link from 'next/link';
import { type ReactNode } from 'react';

interface InviteTabProps {
  userID: string;
}

function FieldLabel({
  children,
  htmlFor,
  required = false,
}: {
  children: ReactNode;
  htmlFor: string;
  required?: boolean;
}) {
  return (
    <Label
      className="flex items-center gap-1 text-xs font-black text-slate-700"
      htmlFor={htmlFor}
      isRequired={required}
    >
      <span>{children}</span>
      {required && (
        <span aria-hidden="true" className="text-todak-coral-500">
          *
        </span>
      )}
      {required && <span className="sr-only">필수</span>}
    </Label>
  );
}

export default function InviteTab({ userID }: InviteTabProps) {
  const customizeHref = (roomID: string) =>
    `/${encodeURIComponent(userID)}/join/customize?roomID=${encodeURIComponent(roomID)}`;

  return (
    <div className="space-y-4">
      <FieldLabel htmlFor="team-invite-code" required>
        팀 초대 코드 입력
      </FieldLabel>
      <Input
        aria-label="팀 초대 코드"
        className="h-9 rounded-xl border border-border bg-surface px-3.5 py-0 text-xs font-semibold text-slate-700 shadow-field placeholder:text-slate-400"
        fullWidth
        id="team-invite-code"
        placeholder="12자리 초대 코드를 입력하세요"
        required
      />
      <Link
        className="flex h-9 w-full items-center justify-center rounded-xl bg-accent text-xs font-black text-accent-foreground shadow-md transition-colors hover:bg-todak-coral-600"
        href={customizeHref('TODAK-INVITE')}
      >
        다음 단계로 이동 (프로필 설정)
      </Link>
    </div>
  );
}
