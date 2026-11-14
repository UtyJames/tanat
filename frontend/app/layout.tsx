import type { Metadata, Viewport } from 'next';
import {
  Bricolage_Grotesque,
  Caveat,
  DM_Mono,
  DM_Sans,
  Inter,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';
import './site.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Tanat — Put an AI Assistant on Your Business in 3 Minutes',
    template: '%s · Tanat',
  },
  description:
    'Give your business an AI assistant that knows your services, remembers your customers, and works on your website, WhatsApp, or Telegram — with human approval when it matters.',
  applicationName: 'Tanat',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'Tanat — Put an AI Assistant on Your Business in 3 Minutes',
    description:
      'Answer customers 24/7, qualify leads, take bookings, and send payment links — trained on your business info.',
    type: 'website',
    siteName: 'Tanat',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tanat — AI Assistants for Real Businesses',
    description:
      'Answer customers 24/7, take bookings, and stay in control with human approvals. Live on your website in 1 line.',
  },
};

export const viewport: Viewport = {
  themeColor: '#f7f5f3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${inter.variable} ${dmMono.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
