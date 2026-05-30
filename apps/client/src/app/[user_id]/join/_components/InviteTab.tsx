'use client';

import { cn } from '@/lib/cn';
import { isSystemError, isTodakApiError } from '@/sevice/error';
import { joinRooms } from '@/sevice/rooms/api';
import { FieldError, Input, Label } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';

import { splitInviteCode, validateInviteCode } from '../_utils/formValidation';

const INPUT_CLASS_NAME =
  'h-9 min-w-0 rounded-xl border border-border bg-surface px-3.5 py-0 text-center text-xs font-black tracking-[0.16em] text-slate-700 uppercase shadow-field placeholder:text-slate-400 focus:border-accent';
const INVALID_INPUT_CLASS_NAME =
  'border-danger focus:border-danger data-[invalid=true]:border-danger';
type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>;

interface InviteTabProps {
  userID: string;
}

function FieldLabel({
  children,
  htmlFor,
  id,
  required = false,
}: {
  children: ReactNode;
  htmlFor: string;
  id?: string;
  required?: boolean;
}) {
  return (
    <Label
      className="flex items-center gap-1 text-xs font-black text-slate-700"
      htmlFor={htmlFor}
      id={id}
      isRequired={required}
    >
      <span>{children}</span>
    </Label>
  );
}

export default function InviteTab({ userID }: InviteTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [inviteCodeFirstPart, setInviteCodeFirstPart] = useState('');
  const [inviteCodeSecondPart, setInviteCodeSecondPart] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const secondInviteCodeInputRef = useRef<HTMLInputElement>(null);
  const firstInviteCodeInputRef = useRef<HTMLInputElement>(null);

  const customizeHref = (roomID: string) =>
    `/${encodeURIComponent(userID)}/join/customize?roomID=${encodeURIComponent(roomID)}`;

  function clearInviteErrors() {
    if (inviteCodeError !== null) {
      setInviteCodeError(null);
    }

    if (joinError !== null) {
      setJoinError(null);
    }
  }

  function handleInviteCodeFirstPartChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const { first, second } = splitInviteCode(event.target.value);

    setInviteCodeFirstPart(first);
    clearInviteErrors();

    if (second !== '') {
      setInviteCodeSecondPart(second);
    }

    if (first.length === 4) {
      secondInviteCodeInputRef.current?.focus();
    }
  }

  function handleInviteCodeSecondPartChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const { first, second } = splitInviteCode(event.target.value);

    setInviteCodeSecondPart(second || first);
    clearInviteErrors();
  }

  function handleInviteCodePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const { first, second } = splitInviteCode(
      event.clipboardData.getData('text'),
    );

    setInviteCodeFirstPart(first);
    setInviteCodeSecondPart(second);
    clearInviteErrors();

    if (second.length < 4) {
      secondInviteCodeInputRef.current?.focus();
    }
  }

  function handleSecondPartKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === 'Backspace' &&
      inviteCodeSecondPart === '' &&
      inviteCodeFirstPart !== ''
    ) {
      firstInviteCodeInputRef.current?.focus();
    }
  }

  const handleInviteSubmit: FormSubmitHandler = async event => {
    event.preventDefault();

    if (isJoining) {
      return;
    }

    const inviteCode =
      inviteCodeFirstPart === '' && inviteCodeSecondPart === ''
        ? ''
        : `${inviteCodeFirstPart}-${inviteCodeSecondPart}`;
    const nextInviteCodeError = validateInviteCode(inviteCode);

    if (nextInviteCodeError !== null) {
      setInviteCodeError(nextInviteCodeError);
      setJoinError(null);
      return;
    }

    setInviteCodeError(null);
    setJoinError(null);
    setIsJoining(true);

    try {
      const room = await joinRooms({ invite_code: inviteCode });

      await queryClient.invalidateQueries({ queryKey: ['myRooms'] });
      router.push(customizeHref(room.room_id));
    } catch (error) {
      if (isTodakApiError(error)) {
        setJoinError(error.response.data.error);
        return;
      }

      if (isSystemError(error)) {
        setJoinError(error.message);
        return;
      }

      setJoinError('초대 코드로 룸 입장에 실패했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <form className="space-y-4" noValidate onSubmit={handleInviteSubmit}>
      <div className="space-y-2">
        <FieldLabel
          htmlFor="team-invite-code"
          id="team-invite-code-label"
          required
        >
          팀 초대 코드 입력
        </FieldLabel>
        <div
          aria-describedby={
            inviteCodeError !== null ? 'team-invite-code-error' : undefined
          }
          aria-labelledby="team-invite-code-label"
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
          role="group"
        >
          <Input
            aria-label="초대 코드 앞 4자리"
            autoComplete="off"
            autoCapitalize="characters"
            className={cn(INPUT_CLASS_NAME, {
              [INVALID_INPUT_CLASS_NAME]: inviteCodeError !== null,
            })}
            disabled={isJoining}
            fullWidth
            id="team-invite-code"
            inputMode="text"
            maxLength={4}
            onChange={handleInviteCodeFirstPartChange}
            onPaste={handleInviteCodePaste}
            placeholder="XXXX"
            ref={firstInviteCodeInputRef}
            value={inviteCodeFirstPart}
          />
          <span className="text-xs font-black text-slate-400">-</span>
          <Input
            aria-label="초대 코드 뒤 4자리"
            autoComplete="off"
            autoCapitalize="characters"
            className={cn(INPUT_CLASS_NAME, {
              [INVALID_INPUT_CLASS_NAME]: inviteCodeError !== null,
            })}
            disabled={isJoining}
            fullWidth
            inputMode="text"
            maxLength={4}
            onChange={handleInviteCodeSecondPartChange}
            onKeyDown={handleSecondPartKeyDown}
            onPaste={handleInviteCodePaste}
            placeholder="XXXX"
            ref={secondInviteCodeInputRef}
            value={inviteCodeSecondPart}
          />
        </div>
        {inviteCodeError !== null && (
          <FieldError
            className="text-[11px] font-bold text-danger"
            id="team-invite-code-error"
          >
            {inviteCodeError}
          </FieldError>
        )}
      </div>

      {joinError !== null && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600"
          role="alert"
        >
          {joinError}
        </p>
      )}

      <button
        className="flex h-9 w-full items-center justify-center rounded-xl bg-accent text-xs font-black text-accent-foreground shadow-md transition-colors hover:bg-todak-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isJoining}
        type="submit"
      >
        {isJoining ? '초대 코드 확인 중...' : '다음 단계로 이동 (프로필 설정)'}
      </button>
    </form>
  );
}
