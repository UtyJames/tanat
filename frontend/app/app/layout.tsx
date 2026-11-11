import type { Metadata } from 'next';
import './dashboard.css';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Tanat agents, conversations, approvals, and payment settings.',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
