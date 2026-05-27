'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import {
  clearAuthToken,
  decodeAuthToken,
  getGithubLoginUrl,
  saveAuthToken,
} from '@/lib/auth';

interface AuthCallbackClientProps {
  token: string | null;
}

export default function AuthCallbackClient({ token }: AuthCallbackClientProps) {
  const router = useRouter();
  const authResult = useMemo(() => {
    if (token === null || token === '') {
      return {
        status: 'error' as const,
        message: 'GitHub 인증 토큰을 받지 못했습니다. 다시 시도해 주세요.',
      };
    }

    const user = decodeAuthToken(token);

    if (user === null || isExpired(user.exp)) {
      return {
        status: 'error' as const,
        message: 'GitHub 인증 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
      };
    }

    return {
      status: 'loading' as const,
      message: `${user.login} 계정으로 연결되었습니다.`,
      user,
    };
  }, [token]);

  useEffect(() => {
    if (authResult.status === 'error') {
      clearAuthToken();
      return;
    }

    if (token === null) {
      return;
    }

    saveAuthToken(token);
    router.replace(`/${encodeURIComponent(authResult.user.id)}/join`);
  }, [authResult, router, token]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <section className="w-full max-w-[360px] rounded-[26px] border border-border/80 bg-surface px-7 py-8 text-center shadow-todak-panel">
        <p className="todak-section-label text-todak-coral-500">GITHUB AUTH</p>
        <h1 className="todak-title mt-2 text-[23px] leading-tight">
          {authResult.status === 'loading' ? '로그인 처리 중' : '로그인 실패'}
        </h1>
        <p className="todak-subcopy mt-3 text-[11px] font-bold leading-5">
          {authResult.message}
        </p>

        {authResult.status === 'error' ? (
          <a
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-5 text-xs font-black text-background shadow-todak-soft"
            href={getGithubLoginUrl()}
          >
            GitHub 계정으로 다시 시작하기
          </a>
        ) : (
          <div
            aria-label="로그인 처리 중"
            className="mx-auto mt-6 size-8 animate-spin rounded-full border-[3px] border-border border-t-accent"
            role="status"
          />
        )}
      </section>
    </main>
  );
}

function isExpired(exp?: number) {
  return typeof exp === 'number' && exp * 1000 <= Date.now();
}
