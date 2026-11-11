import type { Metadata, Viewport } from 'next';
import './globals.css';
import './site.css';

export const metadata: Metadata = {
  title: {
    default: 'Tanat — AI agents that can pay',
    template: '%s · Tanat',
  },
  description:
    'Give your business a payment-ready AI agent on your website, WhatsApp, or Telegram. It proposes, you approve, money moves. Non-custodial, approval-gated, auditable.',
  applicationName: 'Tanat',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'Tanat — AI agents that can pay',
    description:
      'Payment-ready AI agents for real businesses. Website widget, WhatsApp, Telegram, and API. Human approval on every payment.',
    type: 'website',
    siteName: 'Tanat',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tanat — AI agents that can pay',
    description:
      'Payment-ready AI agents for real businesses. Approval-gated. Non-custodial.',
  },
};

export const viewport: Viewport = {
  themeColor: '#f6f3ea',
  width: 'device-width',
  initialScale: 1,
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
