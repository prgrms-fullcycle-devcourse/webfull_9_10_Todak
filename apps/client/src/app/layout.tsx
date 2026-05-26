import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/providers/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Todak',
  description: 'Todak client',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className="todak" data-theme="todak" lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
