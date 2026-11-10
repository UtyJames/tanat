import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tanat — AI agents that can pay',
  description:
    'Multi-tenant AI agents with human approval and NEAR-native money movement.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
