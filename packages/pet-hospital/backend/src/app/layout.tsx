import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pet Hospital API',
  description: 'Enterprise Multi-tenant AI Assistant API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
