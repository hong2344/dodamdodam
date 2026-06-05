import type { Metadata } from 'next'
import { Gowun_Dodum, DM_Mono } from 'next/font/google'
import './globals.css'

const gowunDodum = Gowun_Dodum({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: '고민 한 조각',
  description: '익명 편지 교환 앱',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${gowunDodum.variable} ${dmMono.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="min-h-dvh bg-[#F5F0E6]">{children}</body>
    </html>
  )
}
