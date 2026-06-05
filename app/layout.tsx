import './globals.css';

export const metadata = {
  title: '지뢰찾기',
  description: 'Minesweeper with Next.js + Firebase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
