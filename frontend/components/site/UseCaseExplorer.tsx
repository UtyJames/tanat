'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowIcon, CheckIcon } from '@/components/brand/Logo';

type UseCase = {
  id: string;
  label: string;
  badge: string;
  headline: string;
  problemSolved: string;
  outcomes: string[];
  knowledgeUsed: string[];
  guardrail: string;
  sampleUser: string;
  sampleAgent: string;
  sampleCitation: string;
};

const USE_CASES: UseCase[] = [
  {
    id: 'support',
    label: 'Customer Support',
    badge: '24/7 Resolution',
    headline: 'Answer customer questions accurately using your real policies.',
    problemSolved:
      'Stop losing customers to slow ticket queues or generic chatbots that guess wrong.',
    outcomes: [
      'Resolves routine questions about pricing, shipping, warranties, and troubleshooting instantly',
      'Recalls returning customer history and account context across sessions',
      'Escalates billing disputes or edge cases to your human team with a clean summary',
    ],
    knowledgeUsed: ['Help Center & FAQs', 'Return & SLA Policy', 'Product Manuals'],
    guardrail: 'Refunds & account credits always wait for human approval.',
    sampleUser: 'My shipment arrived 6 hours past our SLA window — can we apply our service credit?',
    sampleAgent:
      'I verified your Enterprise SLA policy: delays over 4 hours qualify for a 15% service credit ($120.00). I have drafted the credit proposal for your account manager to approve.',
    sampleCitation: 'Cited: Enterprise SLA Policy §3.2 · Memory: Enterprise Tier',
  },
  {
    id: 'sales',
    label: 'Sales & Lead Gen',
    badge: 'Pipeline Growth',
    headline: 'Qualify visitors, recommend the right plan, and capture high-intent leads.',
    problemSolved:
      'Turn passive website traffic into qualified sales conversations without static contact forms.',
    outcomes: [
      'Asks smart discovery questions based on team size, industry, and timeline',
      'Recommends the right service package or pricing tier from your catalog',
      'Captures verified lead details and hands off hot prospects to your sales team',
    ],
    knowledgeUsed: ['Pricing & Packaging', 'Service Catalog', 'Case Studies'],
    guardrail: 'Never promises custom discounts without sales leadership sign-off.',
    sampleUser: 'We have a 120-person clinic and need HIPAA-ready AI intake. What plan fits?',
    sampleAgent:
      'For 120 staff with strict tenant isolation and TEE inference, our Growth Workspace fits best. Would you like me to prepare a technical walkthrough and send your requirements to our team?',
    sampleCitation: 'Cited: Healthcare Security Brief · Pricing Guide 2026',
  },
  {
    id: 'bookings',
    label: 'Bookings & Intake',
    badge: 'Zero Back-and-Forth',
    headline: 'Collect client intake details and coordinate appointments smoothly.',
    problemSolved:
      'Eliminate endless email tag for clinics, agencies, salons, and service businesses.',
    outcomes: [
      'Guides clients through eligibility checks and preparation requirements',
      'Collects structured intake information before the appointment',
      'Shares clear cancellation, deposit, and rescheduling policies upfront',
    ],
    knowledgeUsed: ['Service Menu & Duration', 'Prep Instructions', 'Cancellation Policy'],
    guardrail: 'Never gives medical or legal diagnoses; escalates urgent cases immediately.',
    sampleUser: 'Do I need anything before my initial physical therapy evaluation tomorrow?',
    sampleAgent:
      'Please wear comfortable athletic clothing and bring any recent imaging reports. Arrive 10 minutes early for check-in. Need to adjust your 2:00 PM slot?',
    sampleCitation: 'Cited: Patient Intake Checklist · Clinic Hours',
  },
  {
    id: 'hr',
    label: 'HR & People Ops',
    badge: 'Internal Helpdesk',
    headline: 'Give employees instant, private answers on policies, leave, and onboarding.',
    problemSolved:
      'Free your People team from answering the same handbook and PTO questions every week.',
    outcomes: [
      'Answers leave, benefits, expense, and remote-work questions with handbook citations',
      'Walks new hires through Day-1 to Day-30 onboarding checklists',
      'Keeps internal employee knowledge strictly separated from public website bots',
    ],
    knowledgeUsed: ['Employee Handbook', 'Leave & Benefits Policy', 'Onboarding SOPs'],
    guardrail: 'Scoped to internal workspace only; sensitive HR matters escalate privately.',
    sampleUser: 'How many weeks of paid parental leave do we offer after 12 months?',
    sampleAgent:
      'Full-time team members with 12+ months tenure receive 16 weeks of 100% paid parental leave. Submit your expected window in the People portal at least 30 days ahead.',
    sampleCitation: 'Cited: 2026 Employee Handbook §4.2',
  },
  {
    id: 'operations',
    label: 'Operations & SOPs',
    badge: 'Team Execution',
    headline: 'Standardize operational checklists, vendor workflows, and internal triage.',
    problemSolved:
      'Stop tribal knowledge from living in Slack threads and scattered PDFs.',
    outcomes: [
      'Surfaces exact SOP steps for logistics, warehouse, IT, or field teams',
      'Prepares purchase orders, vendor checks, and incident summaries',
      'Logs every execution turn, latency, and cited document for auditability',
    ],
    knowledgeUsed: ['Standard Operating Procedures', 'Vendor Matrix', 'Incident Runbooks'],
    guardrail: 'High-impact operational changes require operator approval.',
    sampleUser: 'We need to restock 50 cold-chain sensor kits from Nordic Sensors.',
    sampleAgent:
      'Drafted PO #2091 for 50× Sensor Kits ($1,450.00) with approved vendor Nordic Sensors. Because it exceeds $500, I routed it to Operations Leadership for sign-off.',
    sampleCitation: 'Cited: Procurement SOP v2.1 · Approved Vendor List',
  },
  {
    id: 'finance',
    label: 'Finance & Payments',
    badge: 'Governed Spend',
    headline: 'Handle billing inquiries, payment links, and spend proposals with strict caps.',
    problemSolved:
      'Let AI assist with invoices and payments without ever giving it a blank cheque.',
    outcomes: [
      'Creates hosted payment links and quotes inside customer conversations',
      'Enforces per-workspace spending limits and idempotency keys',
      'Separates proposer from approver—an agent can never approve its own transfer',
    ],
    knowledgeUsed: ['Billing & Invoice FAQ', 'Approval Thresholds', 'Settlement Policy'],
    guardrail: 'Dual-control human approval enforced before any funds move.',
    sampleUser: 'Can you send me a secure link to pay the $240 deposit for our workshop?',
    sampleAgent:
      'I have prepared a hosted payment link for $240.00 (Workshop Deposit). Once your team approves the payment intent, you can complete checkout securely without sharing card details in chat.',
    sampleCitation: 'Cited: Deposit Policy · Spend Cap Enforced',
  },
];

export default function UseCaseExplorer() {
  const [activeId, setActiveId] = useState<string>(USE_CASES[0].id);
  const current = USE_CASES.find((u) => u.id === activeId) ?? USE_CASES[0];

  return (
    <div className="t-explorer">
      {/* Left Selector List */}
      <div className="t-explorer-nav" role="tablist" aria-label="Business use cases">
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

      {/* Right Rich Detail Panel */}
      <div className="t-explorer-panel" role="tabpanel">
        <div className="t-explorer-panel-head">
          <div>
            <span className="t-eyebrow t-eyebrow-dark">{current.badge}</span>
            <h3>{current.headline}</h3>
            <p className="t-explorer-problem">{current.problemSolved}</p>
          </div>
          <Link className="t-btn t-btn-lime t-btn-sm" href="/start">
            Deploy {current.label} <ArrowIcon size={14} />
          </Link>
        </div>

        <div className="t-explorer-body">
          <div className="t-explorer-outcomes">
            <div className="t-explorer-label">WHAT THE AGENT DOES FOR YOU</div>
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

            <div className="t-explorer-meta-row">
              <div>
                <div className="t-explorer-label">KNOWLEDGE IT USES</div>
                <div className="t-explorer-chips">
                  {current.knowledgeUsed.map((k) => (
                    <span key={k} className="t-explorer-chip">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="t-explorer-label">HUMAN CONTROL</div>
                <div className="t-explorer-guardrail">{current.guardrail}</div>
              </div>
            </div>
          </div>

          <div className="t-explorer-chat">
            <div className="t-explorer-label">LIVE EXAMPLE INTERACTION</div>
            <div className="t-explorer-bubble-user">{current.sampleUser}</div>
            <div className="t-explorer-bubble-agent">{current.sampleAgent}</div>
            <div className="t-explorer-citation">{current.sampleCitation}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

