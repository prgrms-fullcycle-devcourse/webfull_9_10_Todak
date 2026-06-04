'use client';

import { refreshAuthToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthRefreshOnMount() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    void refreshAuthToken().then(token => {
      if (isMounted && token !== null) {
        router.refresh();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  return null;
}
