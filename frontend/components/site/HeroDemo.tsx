'use client';

import { useEffect, useState } from 'react';
import { CheckIcon } from '@/components/brand/Logo';

type SceneKey = 'store' | 'clinic' | 'team';
type Stage = 'typing' | 'action' | 'done';

type Scene = {
  id: SceneKey;
  tab: string;
  businessName: string;
  channel: string;
  memoryNote: string;
  messages: { from: 'user' | 'agent'; text: string }[];
  actionLabel: string;
  actionTitle: string;
  actionMeta: string;
  approveBtn: string;
  doneTitle: string;
  doneSub: string;
};

const SCENES: Record<SceneKey, Scene> = {
  store: {
    id: 'store',
    tab: 'Online Store',
    businessName: 'Loom & Clay Homeware',
    channel: 'Website Chat',
    memoryNote: 'Remembers: Returning customer · Past order #4821',
    messages: [
      {
        from: 'user',
        text: 'Hi! My ceramic lamp arrived with a cracked shade. Can I swap it or get a refund?',
      },
      {
        from: 'agent',
        text: 'I’m sorry about that! Under our 30-day damage policy, you qualify for a free replacement or a full $145 refund. I’ve prepared the refund for your approval.',
      },
    ],
    actionLabel: 'Owner Approval',
    actionTitle: 'Refund $145.00 · Order #4821',
    actionMeta: 'Based on your Return Policy · Waiting for your 1-click sign-off',
    approveBtn: 'Approve refund',
    doneTitle: 'Refund approved',
    doneSub: 'Customer notified automatically',
  },
  clinic: {
    id: 'clinic',
    tab: 'Bookings & Clinic',
    businessName: 'Harbor Dental Studio',
    channel: 'WhatsApp',
    memoryNote: 'Remembers: Prefers morning slots · New patient intake',
    messages: [
      {
        from: 'user',
        text: 'Do you have any teeth whitening slots open this Friday morning, and how much is the deposit?',
      },
      {
        from: 'agent',
        text: 'Yes — we have 9:30 AM and 11:00 AM open this Friday. The booking deposit is $40 (applied to your visit). Want me to hold 9:30 AM?',
      },
    ],
    actionLabel: 'Booking & Deposit',
    actionTitle: 'Friday 9:30 AM · $40.00 Deposit',
    actionMeta: 'New patient intake ready · Secure payment link prepared',
    approveBtn: 'Confirm booking',
    doneTitle: 'Booking confirmed',
    doneSub: 'Payment link & reminder sent',
  },
  team: {
    id: 'team',
    tab: 'Internal Team',
    businessName: 'Northwind Operations',
    channel: 'Team Workspace',
    memoryNote: 'Reads: 2026 Employee Handbook & SOPs',
    messages: [
      {
        from: 'user',
        text: 'What’s our travel meal allowance for client trips, and do I need pre-approval?',
      },
      {
        from: 'agent',
        text: 'Daily meal allowance is up to $75/day on client travel. Expenses under $250 don’t need pre-approval — just upload your receipt within 7 days.',
      },
    ],
    actionLabel: 'Expense Check',
    actionTitle: 'Policy Verified · Up to $75/day',
    actionMeta: 'Source: Employee Handbook §6 · No manager sign-off needed',
    approveBtn: 'Log travel note',
    doneTitle: 'Travel note saved',
    doneSub: 'Added to team activity log',
  },
};

export default function HeroDemo() {
  const [sceneKey, setSceneKey] = useState<SceneKey>('store');
  const [stage, setStage] = useState<Stage>('typing');
  const scene = SCENES[sceneKey];

  useEffect(() => {
    setStage('typing');
    const timer = window.setTimeout(() => setStage('action'), 850);
    return () => window.clearTimeout(timer);
  }, [sceneKey]);

  return (
    <div className="t-demo gsap-hero-demo" aria-label="Interactive business assistant demo">
      <div className="t-demo-bar">
        <span className="t-demo-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="t-demo-url">{scene.businessName}</span>
        <span className="t-demo-live">{scene.channel}</span>
      </div>

      {/* Simple switcher */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '10px 14px',
          background: '#11130F',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {(Object.keys(SCENES) as SceneKey[]).map((key) => {
          const active = key === sceneKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSceneKey(key)}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 8,
                border: active
                  ? '1px solid #C9F26B'
                  : '1px solid rgba(255,255,255,0.12)',
                background: active ? '#C9F26B' : 'rgba(255,255,255,0.04)',
                color: active ? '#0C0D0B' : '#F6F3EA',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {SCENES[key].tab}
            </button>
          );
        })}
      </div>

      <div className="t-demo-body">
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--muted)',
            background: 'rgba(12,13,11,0.04)',
            padding: '6px 10px',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {scene.memoryNote}
        </div>

        <div className="t-chat">
          {scene.messages.map((message, index) => (
            <div
              key={`${sceneKey}-${index}`}
              className={`t-bubble ${
                message.from === 'user' ? 't-bubble-user' : 't-bubble-agent'
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {message.text}
            </div>
          ))}

          {stage === 'typing' && (
            <div className="t-bubble-typing" aria-label="Assistant is preparing action">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>

        {stage === 'action' && (
          <div className="t-approval">
            <div className="t-approval-top">
              <span className="t-approval-label">{scene.actionLabel}</span>
              <span className="t-pill t-pill-lime">You decide</span>
            </div>
            <div className="t-approval-amount" style={{ fontSize: 18 }}>
              {scene.actionTitle}
            </div>
            <div className="t-approval-meta">{scene.actionMeta}</div>
            <div className="t-approval-actions">
              <button
                className="t-mini-btn t-mini-approve"
                onClick={() => setStage('done')}
              >
                {scene.approveBtn}
              </button>
              <button
                className="t-mini-btn t-mini-reject"
                onClick={() => setStage('typing')}
              >
                Replay
              </button>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="t-receipt">
            <span className="t-receipt-icon">
              <CheckIcon size={14} />
            </span>
            <span>
              <span className="t-receipt-title">{scene.doneTitle}</span>
              <span className="t-receipt-sub">{scene.doneSub}</span>
            </span>
          </div>
        )}
      </div>

      <div className="t-demo-foot">
        <span>Try clicking the button above</span>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
          Nothing happens without your OK
        </span>
      </div>
    </div>
  );
}
