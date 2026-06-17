import './globals.css';
import { QueryProvider } from '@/providers/query-provider';

import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/constants/metadata';
import { DeviceSupportGate } from './_components/DeviceSupportGate';
import { SocketProvider } from '@/providers/SocketProvider';

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
  openGraph: {
    siteName: SITE_CONFIG.siteName,
    locale: 'ko_KR',
    type: 'website',
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: [
      {
        url: '/metadata/todak-main-image.webp',
        width: 1200,
        height: 630,
        alt: '토닥윗미 대표 이미지',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: ['/metadata/todak-main-image.webp'],
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html className="todak" data-theme="todak" lang="ko">
      <body>
        <DeviceSupportGate>
          <QueryProvider>
            <SocketProvider>{children}</SocketProvider>
          </QueryProvider>
        </DeviceSupportGate>
      </body>
    </html>
  );
}
