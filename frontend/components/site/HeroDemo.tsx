'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, LogoMark } from '@/components/brand/Logo';

type AgentMode = 'support' | 'sales' | 'hr' | 'operations';
type Stage = 'idle' | 'typing' | 'action' | 'done';

type AgentPreview = {
  id: AgentMode;
  label: string;
  role: string;
  channel: string;
  knowledgeSource: string;
  memoryTag: string;
  messages: { from: 'user' | 'agent'; text: string }[];
  governanceLabel: string;
  governanceTitle: string;
  governanceMeta: string;
  approveLabel: string;
  completedText: string;
};

const previews: Record<AgentMode, AgentPreview> = {
  support: {
    id: 'support',
    label: 'Customer Support',
    role: 'Customer Support Agent',
    channel: 'Website Widget · acme-logistics.com',
    knowledgeSource: 'Return & SLA Policy v4.2',
    memoryTag: 'Remembers: Enterprise tier · Net-30 account',
    messages: [
      {
        from: 'user',
        text: 'Our cold-chain shipment #SHP-904 arrived 6 hours past SLA. Can we claim our SLA credit?',
      },
      {
        from: 'agent',
        text: 'I verified your Enterprise SLA policy. Delays over 4 hours qualify for a 15% service credit ($120.00). I have drafted the credit proposal for finance approval.',
      },
    ],
    governanceLabel: 'Action Governance · Human-in-the-loop',
    governanceTitle: '$120.00 SLA Credit',
    governanceMeta: 'Source: Return & SLA Policy · Requires Operator Approval',
    approveLabel: 'Approve SLA Credit',
    completedText: 'Approved · Logged to audit trail & customer notified',
  },
  sales: {
    id: 'sales',
    label: 'Sales & Leads',
    role: 'Sales & Qualification Agent',
    channel: 'WhatsApp Business · +1 415 890',
    knowledgeSource: 'Enterprise Pricing & Security FAQ',
    memoryTag: 'Remembers: 140 seats · Healthcare compliance required',
    messages: [
      {
        from: 'user',
        text: 'Do you support HIPAA-ready deployments for a 140-person clinical team, and can we book a technical review?',
      },
      {
        from: 'agent',
        text: 'Yes — our Growth & Enterprise tiers include isolated tenant workspaces and hardware-attested TEE inference. For 140 seats, annual pricing starts at $1,250/mo.',
      },
    ],
    governanceLabel: 'Lead Qualification & Handoff',
    governanceTitle: 'Qualified Enterprise Lead · 140 Seats',
    governanceMeta: 'Route to Account Executive · Calendar invite ready',
    approveLabel: 'Confirm Handoff',
    completedText: 'Lead routed to Sales team · Briefing attached',
  },
  hr: {
    id: 'hr',
    label: 'HR & Internal',
    role: 'HR & People Support Agent',
    channel: 'Internal Workspace · #people-ops',
    knowledgeSource: '2026 Employee Handbook & Parental Leave Policy',
    memoryTag: 'Scope: Internal Employees Only · Confidential',
    messages: [
      {
        from: 'user',
        text: 'How many weeks of paid parental leave do full-time engineers get after 1 year, and how do I submit the notice?',
      },
      {
        from: 'agent',
        text: 'Full-time team members with 12+ months tenure receive 16 weeks of 100% paid parental leave. Submit your leave window at least 30 days in advance.',
      },
    ],
    governanceLabel: 'Internal Workflow Proposal',
    governanceTitle: 'Parental Leave Intake Draft',
    governanceMeta: 'Handbook Sec 4.2 · Escalates sensitive questions to HR',
    approveLabel: 'Send Intake Summary to HR',
    completedText: 'HR People Partner notified with policy citations',
  },
  operations: {
    id: 'operations',
    label: 'Operations',
    role: 'Operations & Procurement Agent',
    channel: 'API / Operations Console',
    knowledgeSource: 'Vendor SOP & Spend Governance Matrix',
    memoryTag: 'Remembers: Preferred vendor · Spend cap enforced',
    messages: [
      {
        from: 'user',
        text: 'Restock 50 units of cold-storage sensor kits from Nordic Sensors and prepare the PO.',
      },
      {
        from: 'agent',
        text: 'Prepared PO #PO-2091 for 50× Sensor Kits ($1,450.00 total) under approved vendor Nordic Sensors. Because it exceeds $500, manager sign-off is required.',
      },
    ],
    governanceLabel: 'Spend Cap & Dual Control',
    governanceTitle: 'PO #PO-2091 · $1,450.00',
    governanceMeta: 'Vendor: Nordic Sensors · Idempotency key locked',
    approveLabel: 'Approve Purchase Order',
    completedText: 'Purchase order approved · Audit record committed',
  },
};

export default function HeroDemo() {
  const [mode, setMode] = useState<AgentMode>('support');
  const [stage, setStage] = useState<Stage>('idle');
  const scene = previews[mode];

  useEffect(() => {
    setStage('idle');
    const typing = window.setTimeout(() => setStage('typing'), 450);
    const action = window.setTimeout(() => setStage('action'), 1100);
    return () => {
      window.clearTimeout(typing);
      window.clearTimeout(action);
    };
  }, [mode]);

  return (
    <div className="t-demo" aria-label="Tanat AI Infrastructure Architecture and Live Agent Preview">
      {/* Top window bar */}
      <div className="t-demo-bar">
        <span className="t-demo-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="t-demo-url">tanat.infrastructure · workspace</span>
        <span className="t-demo-live">TEE ATTESTED</span>
      </div>

      {/* Connected Infrastructure Architecture Diagram */}
      <div
        style={{
          padding: '14px 16px',
          background: '#11130F',
          color: '#F6F3EA',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(246,243,234,0.58)',
            marginBottom: 10,
          }}
        >
          <span>1. Knowledge & Memory</span>
          <span style={{ color: '#C9F26B' }}>2. Tanat Core</span>
          <span>3. Agents & Channels</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1.25fr',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {/* Left: Knowledge & Business Context */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div
              style={{
                padding: '6px 9px',
                borderRadius: 7,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 11,
              }}
            >
              <div style={{ color: '#C9F26B', fontFamily: 'var(--font-mono)', fontSize: 9.5 }}>
                KNOWLEDGE LAYER
              </div>
              <div style={{ fontWeight: 500, marginTop: 1, fontSize: 11 }}>
                {scene.knowledgeSource}
              </div>
            </div>
            <div
              style={{
                padding: '6px 9px',
                borderRadius: 7,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 10.5,
                color: 'rgba(246,243,234,0.78)',
              }}
            >
              {scene.memoryTag}
            </div>
          </div>

          {/* Center: Tanat Infrastructure Hub */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(201,242,107,0.12)',
              border: '1px solid rgba(201,242,107,0.45)',
            }}
          >
            <LogoMark size={26} tone="lime" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: '#C9F26B',
                letterSpacing: '0.06em',
              }}
            >
              TANAT CORE
            </span>
          </div>

          {/* Right: Multi-agent selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {(Object.keys(previews) as AgentMode[]).map((key) => {
              const active = key === mode;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    borderRadius: 7,
                    border: active
                      ? '1px solid #C9F26B'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: active ? '#C9F26B' : 'rgba(255,255,255,0.04)',
                    color: active ? '#0C0D0B' : '#F6F3EA',
                    fontSize: 10.5,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                  }}
                >
                  {previews[key].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Agent Execution & Governance Body */}
      <div className="t-demo-body">
        <div className="t-demo-channel">
          <span className="t-demo-channel-name">
            <i aria-hidden="true">◆</i>
            {scene.role}
          </span>
          <span className="t-mono" style={{ color: 'var(--muted-2)', fontSize: 10.5 }}>
            {scene.channel}
          </span>
        </div>

        <div className="t-chat">
          {scene.messages.map((message, index) => (
            <div
              key={`${mode}-${index}`}
              className={`t-bubble ${
                message.from === 'user' ? 't-bubble-user' : 't-bubble-agent'
              }`}
              style={{ animationDelay: `${index * 160}ms` }}
            >
              {message.text}
            </div>
          ))}

          {stage === 'typing' && (
            <div className="t-bubble-typing" aria-label="Agent is reasoning">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>

        {stage === 'action' && (
          <div className="t-approval">
            <div className="t-approval-top">
              <span className="t-approval-label">{scene.governanceLabel}</span>
              <span className="t-pill t-pill-lime">Permission check</span>
            </div>
            <div className="t-approval-amount" style={{ fontSize: 19 }}>
              {scene.governanceTitle}
            </div>
            <div className="t-approval-meta">{scene.governanceMeta}</div>
            <div className="t-approval-actions">
              <button
                className="t-mini-btn t-mini-approve"
                onClick={() => setStage('done')}
              >
                {scene.approveLabel}
              </button>
              <button
                className="t-mini-btn t-mini-reject"
                onClick={() => setStage('idle')}
              >
                Hold for review
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
              <span className="t-receipt-title">Action verified & recorded</span>
              <span className="t-receipt-sub">{scene.completedText}</span>
            </span>
          </div>
        )}
      </div>

      <div className="t-demo-foot">
        <span>
          Switch agents above — <strong>same infrastructure underneath</strong>
        </span>
        <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
          Website · WhatsApp · Slack · API
        </span>
      </div>
    </div>
  );
}
