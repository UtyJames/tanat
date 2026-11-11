'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo, CheckIcon } from '@/components/brand/Logo';
import { PUBLIC_BASE_URL } from '@/lib/api';

interface PublicPaymentIntent {
  id: string;
  tenant_name: string;
  amount: string;
  currency: string;
  description: string;
  status: string;
  expires_at: string;
  created_at: string;
}

function HostedPaymentContent() {
  const searchParams = useSearchParams();
  const intentId = searchParams.get('intent');
  const [intent, setIntent] = useState<PublicPaymentIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!intentId) {
      setError('Missing payment intent ID (?intent=pay_...).');
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(
          `${PUBLIC_BASE_URL}/api/public/v1/payment-intents/${encodeURIComponent(
            intentId,
          )}`,
          { cache: 'no-store' },
        );
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          setError(payload?.error?.message ?? 'Payment intent not found.');
        } else {
          setIntent(payload.data);
        }
      } catch {
        setError('Could not reach the Tanat API.');
      } finally {
        setLoading(false);
      }
    })();
  }, [intentId]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F6F3EA',
        color: '#0C0D0B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#FFFFFF',
          border: '1px solid rgba(12,13,11,0.12)',
          borderRadius: 18,
          padding: 28,
          boxShadow: '0 18px 48px rgba(12,13,11,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Logo size={26} />
          <span className="t-pill t-pill-lime">Hosted Payment Link</span>
        </div>

        {loading ? (
          <p>Loading payment details…</p>
        ) : error || !intent ? (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Payment Link Unavailable</h1>
            <p style={{ color: '#6B7065', fontSize: 14 }}>{error}</p>
            <Link
              href="/"
              className="t-btn t-btn-ink"
              style={{ marginTop: 16, display: 'inline-flex' }}
            >
              Return to Tanat
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#6B7065', textTransform: 'uppercase' }}>
              Pay {intent.tenant_name}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                margin: '6px 0 8px',
              }}
            >
              {intent.amount} {intent.currency}
            </div>
            <p style={{ fontSize: 14, color: '#45493F', marginBottom: 18 }}>
              {intent.description}
            </p>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: '#F6F3EA',
                fontSize: 12.5,
                marginBottom: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div>
                <strong>Intent ID:</strong> <code>{intent.id}</code>
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  {intent.status}
                </span>
              </div>
              <div>
                <strong>Expires:</strong> {intent.expires_at}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#3F6B2A',
              }}
            >
              <CheckIcon size={14} /> Governed by Tanat human-in-the-loop controls
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function HostedPayPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading checkout…</div>}>
      <HostedPaymentContent />
    </Suspense>
  );
}

