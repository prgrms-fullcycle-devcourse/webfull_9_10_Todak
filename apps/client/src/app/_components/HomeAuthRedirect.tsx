'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getStoredAuthUser } from '@/lib/auth';

export default function HomeAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredAuthUser();

    if (user !== null) {
      router.replace(`/${encodeURIComponent(user.id)}/join`);
    }
  }, [router]);

  return null;
}
