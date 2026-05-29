import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: '도담도담',
  description: '익명으로 마음을 나누는 도담도담',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#4A7C59',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <PwaRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
