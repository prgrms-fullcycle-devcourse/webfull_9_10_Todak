import type { Metadata } from 'next';

import { QueryProvider } from '@/providers/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: '토닥윗미',
  description: 'AI와 GitHub를 연결하는 2D 가상 협업 타운',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html className="todak" data-theme="todak" lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
