'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowIcon, CheckIcon } from '@/components/brand/Logo';

type UseCase = {
  id: string;
  label: string;
  badge: string;
  headline: string;
  outcomes: string[];
  sampleUser: string;
  sampleAgent: string;
  sampleCitation: string;
};

const USE_CASES: UseCase[] = [
  {
    id: 'support',
    label: 'Online Stores & Retail',
    badge: 'Support & Orders',
    headline: 'Answer product questions, handle returns, and send checkout links.',
    outcomes: [
      'Replies instantly to sizing, shipping, and return questions using your store policies',
      'Remembers returning shoppers and what they bought before',
      'Prepares refunds or payment links — you approve with one click',
    ],
    sampleUser: 'Do you ship the linen duvet to Austin by Friday?',
    sampleAgent:
      'Yes! Orders placed before 2 PM arrive in Austin by Friday with Express Shipping ($12). Want me to send a quick checkout link?',
    sampleCitation: 'From your Shipping FAQ',
  },
  {
    id: 'bookings',
    label: 'Clinics, Salons & Bookings',
    badge: 'Appointments',
    headline: 'Answer prep questions and book clients without back-and-forth emails.',
    outcomes: [
      'Shares hours, pricing, location, and preparation steps automatically',
      'Collects intake details before the client walks in',
      'Handles booking deposits safely without asking for card numbers in chat',
    ],
    sampleUser: 'What should I bring to my first physiotherapy session tomorrow?',
    sampleAgent:
      'Wear comfortable athletic clothes and bring any recent scans. Please arrive 10 minutes early for check-in!',
    sampleCitation: 'From your Patient Guide',
  },
  {
    id: 'sales',
    label: 'Agencies & Service Businesses',
    badge: 'Lead Qualification',
    headline: 'Turn website visitors into qualified leads while you sleep.',
    outcomes: [
      'Explains your packages, timelines, and pricing clearly',
      'Asks what the prospect needs and captures their contact info',
      'Routes serious buyers straight to your team with a clean summary',
    ],
    sampleUser: 'We need a brand refresh and new website in 6 weeks. Can you help?',
    sampleAgent:
      'Yes — our 6-week Launch Package covers brand identity and web build starting at $4,500. What’s your email so our lead partner can send times for a quick intro call?',
    sampleCitation: 'From your Services & Pricing',
  },
  {
    id: 'hr',
    label: 'Internal Team & HR Helpdesk',
    badge: 'Employee Support',
    headline: 'Stop answering the same handbook and policy questions every week.',
    outcomes: [
      'Gives staff instant answers on PTO, expenses, and onboarding checklists',
      'Stays private to your team — separate from your public website bot',
      'Escalates sensitive HR or IT issues to the right person',
    ],
    sampleUser: 'How do I submit a software reimbursement under $100?',
    sampleAgent:
      'Expenses under $100 are pre-approved! Just upload the receipt in the Finance portal under "Team Tools" by the end of the month.',
    sampleCitation: 'From your Employee Handbook',
  },
];

export default function UseCaseExplorer() {
  const [activeId, setActiveId] = useState<string>(USE_CASES[0].id);
  const current = USE_CASES.find((u) => u.id === activeId) ?? USE_CASES[0];

  return (
    <div className="t-explorer">
      <div className="t-explorer-nav" role="tablist" aria-label="Business examples">
        {USE_CASES.map((item) => {
          const active = item.id === current.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`t-explorer-tab ${active ? 'active' : ''}`}
              onClick={() => setActiveId(item.id)}
            >
              <span className="t-explorer-tab-top">
                <strong>{item.label}</strong>
                <span className="t-explorer-badge">{item.badge}</span>
              </span>
              <span className="t-explorer-tab-sub">{item.headline}</span>
            </button>
          );
        })}
      </div>

      <div className="t-explorer-panel" role="tabpanel">
        <div className="t-explorer-panel-head">
          <div>
            <span className="t-eyebrow t-eyebrow-dark">{current.badge}</span>
            <h3>{current.headline}</h3>
          </div>
          <Link className="t-btn t-btn-lime t-btn-sm" href="/start">
            Set this up <ArrowIcon size={14} />
          </Link>
        </div>

        <div className="t-explorer-body">
          <div className="t-explorer-outcomes">
            <div className="t-explorer-label">HOW IT HELPS YOUR BUSINESS</div>
            <ul>
              {current.outcomes.map((o) => (
                <li key={o}>
                  <span className="t-explorer-check">
                    <CheckIcon size={11} />
                  </span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="t-explorer-chat">
            <div className="t-explorer-label">EXAMPLE CHAT</div>
            <div className="t-explorer-bubble-user">{current.sampleUser}</div>
            <div className="t-explorer-bubble-agent">{current.sampleAgent}</div>
            <div className="t-explorer-citation">{current.sampleCitation}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
