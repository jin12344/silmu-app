import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '지뢰찾기',
  description: 'Minesweeper — Next.js + Firebase Realtime Database',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
