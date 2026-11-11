'use client';

import { useEffect, useState } from 'react';
import { CheckIcon } from '@/components/brand/Logo';

type Channel = 'website' | 'whatsapp' | 'telegram';
type Stage = 'idle' | 'typing' | 'approval' | 'approved';

type Scene = {
  label: string;
  icon: string;
  url: string;
  customer: string;
  messages: { from: 'user' | 'agent'; text: string }[];
  amount: string;
  meta: string;
  receipt: string;
};

const scenes: Record<Channel, Scene> = {
  website: {
    label: 'Website',
    icon: '◎',
    url: 'acme.store',
    customer: 'Ada',
    messages: [
      { from: 'user', text: 'Do you have the Arc lamp in matte black?' },
      {
        from: 'agent',
        text: 'Yes — 3 left. It’s $189 with delivery to 14 Palm St. Want me to take payment?',
      },
    ],
    amount: '$189.00',
    meta: 'Arc Lamp · Order #4821 · Card',
    receipt: 'Approved by Ada · settled in 2.4s',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'W',
    url: '+1 415 · Academy Store',
    customer: 'Daniel',
    messages: [
      { from: 'user', text: 'Hi, can I get 2 linen shirts in size M?' },
      {
        from: 'agent',
        text: 'Both are in stock. Total with shipping is $148. I’ll send a secure link — approve below?',
      },
    ],
    amount: '$148.00',
    meta: '2 × Linen Shirt · Shipping included',
    receipt: 'Paid by Daniel · link opened · settled',
  },
  telegram: {
    label: 'Telegram',
    icon: 'T',
    url: '@arc_bistro_bot',
    customer: 'Maya',
    messages: [
      { from: 'user', text: 'Book the 6pm table and take the deposit?' },
      {
        from: 'agent',
        text: 'Table for 4 at 6pm is free. The deposit is $40 and comes off the bill. Approve?',
      },
    ],
    amount: '$40.00',
    meta: 'Table for 4 · 6:00 PM · Deposit',
    receipt: 'Deposit approved · booking confirmed',
  },
};

export default function HeroDemo() {
  const [channel, setChannel] = useState<Channel>('website');
  const [stage, setStage] = useState<Stage>('idle');
  const scene = scenes[channel];

  useEffect(() => {
    setStage('idle');
    const typing = window.setTimeout(() => setStage('typing'), 650);
    const approval = window.setTimeout(() => setStage('approval'), 1450);
    return () => {
      window.clearTimeout(typing);
      window.clearTimeout(approval);
    };
  }, [channel]);

  return (
    <div className="t-demo" aria-label="Interactive approval demo">
      <div className="t-demo-bar">
        <span className="t-demo-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="t-demo-url">{scene.url}</span>
        <span className="t-demo-live">LIVE</span>
      </div>

      <div className="t-demo-body">
        <div className="t-demo-channel">
          <span className="t-demo-channel-name">
            <i aria-hidden="true">{scene.icon}</i>
            {scene.label} · Tanat agent
          </span>
          <span className="t-mono" style={{ color: 'var(--muted-2)' }}>
            test
          </span>
        </div>

        <div className="t-chat">
          {scene.messages.map((message, index) => (
            <div
              key={`${channel}-${index}`}
              className={`t-bubble ${
                message.from === 'user' ? 't-bubble-user' : 't-bubble-agent'
              }`}
              style={{ animationDelay: `${index * 180}ms` }}
            >
              {message.text}
            </div>
          ))}

          {stage === 'typing' && (
            <div className="t-bubble-typing" aria-label="Agent is typing">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>

        {stage === 'approval' && (
          <div className="t-approval">
            <div className="t-approval-top">
              <span className="t-approval-label">Payment request</span>
              <span className="t-pill t-pill-lime">Needs you</span>
            </div>
            <div className="t-approval-amount">{scene.amount}</div>
            <div className="t-approval-meta">{scene.meta}</div>
            <div className="t-approval-actions">
              <button
                className="t-mini-btn t-mini-approve"
                onClick={() => setStage('approved')}
              >
                Approve payment
              </button>
              <button
                className="t-mini-btn t-mini-reject"
                onClick={() => setStage('idle')}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {stage === 'approved' && (
          <div className="t-receipt">
            <span className="t-receipt-icon">
              <CheckIcon size={14} />
            </span>
            <span>
              <span className="t-receipt-title">Payment approved</span>
              <span className="t-receipt-sub">{scene.receipt}</span>
            </span>
          </div>
        )}
      </div>

      <div className="t-demo-foot">
        <span>
          Try it — <strong>approve the payment</strong>
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(scenes) as Channel[]).map((key) => (
            <button
              key={key}
              onClick={() => setChannel(key)}
              className="t-mini-btn"
              style={{
                width: 'auto',
                height: 24,
                padding: '0 8px',
                fontSize: 9.5,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: key === channel ? 'var(--ink)' : 'transparent',
                color: key === channel ? 'var(--lime)' : 'var(--muted)',
              }}
            >
              {scenes[key].label}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
