'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../landing.css';
import {
  ApiError,
  completeOnboarding,
  createSession,
  getOnboarding,
  getStoredKey,
  requestOtp,
  saveOnboardingState,
  sendMessage,
  verifyOtp,
} from '@/lib/api';
import { FormattedPreview } from '@/components/FormattedPreview';
import { TanatMascotIcon } from '@/components/brand/PlatformLogos';

const INDUSTRIES = [
  { id: 'ecommerce', label: 'E-commerce & Retail' },
  { id: 'saas', label: 'SaaS & Technology' },
  { id: 'healthcare', label: 'Healthcare & Clinics' },
  { id: 'finance', label: 'Financial Services & Fintech' },
  { id: 'hr_recruiting', label: 'HR & Recruiting' },
  { id: 'agencies', label: 'Agencies & Consulting' },
  { id: 'logistics', label: 'Logistics & Supply Chain' },
  { id: 'education', label: 'Education & Training' },
  { id: 'other', label: 'Other / Multi-Disciplinary' },
];

interface OnboardingTemplate {
  id: string;
  name: string;
  role: string;
  description: string;
  responsibilities: string[];
  restrictions: string;
}

const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'tpl_customer_support',
    name: 'Customer Support Agent',
    role: 'Support',
    description: 'Resolves customer questions, returns, and service tickets 24/7.',
    responsibilities: ['Answer FAQs & policies', 'Track order & account issues', 'Escalate sensitive refunds'],
    restrictions: 'Read-only knowledge access; refunds & transfers require human approval.',
  },
  {
    id: 'tpl_sales_advisor',
    name: 'Sales Assistant',
    role: 'Sales',
    description: 'Qualifies inbound leads, recommends plans/products, and captures intent.',
    responsibilities: ['Qualify leads & budgets', 'Recommend matching tiers', 'Book demos or hand off'],
    restrictions: 'Cannot issue discounts or contracts without team approval.',
  },
  {
    id: 'tpl_hr_assistant',
    name: 'HR Assistant',
    role: 'HR & People',
    description: 'Helps employees with leave policies, onboarding checklists, and handbooks.',
    responsibilities: ['Answer HR & benefits FAQs', 'Guide new-hire onboarding', 'Route sensitive requests'],
    restrictions: 'Strictly tenant-isolated; cannot modify payroll or staff roles.',
  },
  {
    id: 'tpl_operations_assistant',
    name: 'Operations Assistant',
    role: 'Operations',
    description: 'Supports staff with internal SOPs, runbooks, and intake workflows.',
    responsibilities: ['Search internal SOPs', 'Triage ops tickets', 'Draft status updates'],
    restrictions: 'Scoped to assigned operational channels and read-only docs by default.',
  },
  {
    id: 'tpl_finance_assistant',
    name: 'Finance Assistant',
    role: 'Finance',
    description: 'Assists with invoice questions, spend limits, and payment proposals.',
    responsibilities: ['Answer billing questions', 'Prepare payment proposals', 'Log approval requests'],
    restrictions: 'Dual-approval enforced for high-risk NEAR payments; cannot self-approve.',
  },
  {
    id: 'tpl_custom',
    name: 'Custom Agent',
    role: 'Custom',
    description: 'Start with a clean, security-hardened blank blueprint you can tailor later.',
    responsibilities: ['General workspace Q&A', 'Configurable tools & channels', 'Expand anytime in dashboard'],
    restrictions: 'Least-privilege defaults; advanced tools disabled until explicitly enabled.',
  },
];

type ChannelChoice = 'website' | 'telegram' | 'slack' | 'api' | 'skip';

export default function StartOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [authed, setAuthed] = useState(false);

  // Step 1: Workspace + Auth
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('saas');
  const [workEmail, setWorkEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Step 2: Agent Template
  const [selectedTemplateId, setSelectedTemplateId] = useState('tpl_customer_support');

  // Step 3: Deploy & Test
  const [channel, setChannel] = useState<ChannelChoice>('website');
  const [websiteOrigin, setWebsiteOrigin] = useState('');
  const [provisioned, setProvisioned] = useState<{
    installationId: string;
    agentName: string;
    publishableKey?: string | null;
  } | null>(null);
  const [sandboxSessionId, setSandboxSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('What can you help our customers with today?');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Restore resumable onboarding state on load
  useEffect(() => {
    const key = getStoredKey();
    if (!key) return;
    setAuthed(true);
    void (async () => {
      try {
        const data = await getOnboarding();
        if (data.tenant?.name && !businessName) setBusinessName(data.tenant.name);
        const state = data.onboarding;
        if (state) {
          if (state.industry) setIndustry(state.industry);
          if (state.business_email) setWorkEmail(state.business_email);
          if (state.template_id) setSelectedTemplateId(state.template_id);
          if (typeof state.step === 'number' && state.step >= 1 && state.step <= 3) {
            setStep(state.step as 1 | 2 | 3);
          }
        }
        if (data.installations?.[0]?.id && data.agents?.[0]?.name) {
          setProvisioned({
            installationId: data.installations[0].id,
            agentName: data.agents[0].name,
            publishableKey: data.publishable_keys?.[0]?.key_prefix ?? null,
          });
        }
      } catch {
        // Ignore if session expired
      }
    })();
  }, []);

  async function persistProgress(nextStep: number) {
    if (!getStoredKey()) return;
    try {
      await saveOnboardingState({
        step: nextStep,
        draft: {
          business_name: businessName,
          industry,
          business_email: workEmail,
          template_id: selectedTemplateId,
          selected_channels: channel === 'skip' ? ['api'] : [channel],
        },
      });
    } catch {
      // Non-blocking auto-save
    }
  }

  async function handleStep1Continue() {
    setError(null);
    setNotice(null);
    if (businessName.trim().length < 2) {
      setError('Please enter your business name (at least 2 characters).');
      return;
    }

    if (!authed) {
      if (!workEmail.includes('@')) {
        setError('Please enter a valid work email address.');
        return;
      }
      setBusy(true);
      try {
        if (!otpSent) {
          await requestOtp({ email: workEmail.trim(), tenant_name: businessName.trim() });
          setOtpSent(true);
          setNotice(`Verification code sent to ${workEmail.trim()}.`);
        } else {
          await verifyOtp(workEmail.trim(), otpCode.trim());
          setAuthed(true);
          await persistProgress(2);
          setStep(2);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Authentication failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    await persistProgress(2);
    setStep(2);
  }

  async function handleStep2Continue() {
    setError(null);
    await persistProgress(3);
    setStep(3);
  }

  async function handleProvisionAndPublish(completeFlag: boolean) {
    setBusy(true);
    setError(null);
    try {
      const tpl = ONBOARDING_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? ONBOARDING_TEMPLATES[0];
      const channelsToSend: Array<'website' | 'telegram' | 'slack' | 'api'> =
        channel === 'skip' ? ['api'] : [channel];
      const res = await completeOnboarding({
        business_name: businessName.trim(),
        industry,
        business_email: workEmail.trim(),
        website_url: websiteOrigin.trim() || undefined,
        allowed_domains: websiteOrigin.trim() ? [websiteOrigin.trim()] : undefined,
        template_id: tpl.id,
        agent_name: tpl.name,
        selected_channels: channelsToSend,
        step: 3,
      });
      setProvisioned({
        installationId: res.installation_id,
        agentName: tpl.name,
        publishableKey: res.publishable_key || null,
      });
      setNotice(
        completeFlag
          ? 'Your AI agent is ready! Test it below or open your workspace.'
          : 'Sandbox provisioned — send a test message below.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not provision agent.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSandboxSend() {
    if (!chatInput.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let instId = provisioned?.installationId;
      if (!instId) {
        const tpl = ONBOARDING_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? ONBOARDING_TEMPLATES[0];
        const res = await completeOnboarding({
          business_name: businessName.trim() || 'My Workspace',
          industry,
          business_email: workEmail.trim() || undefined,
          website_url: websiteOrigin.trim() || undefined,
          allowed_domains: websiteOrigin.trim() ? [websiteOrigin.trim()] : undefined,
          template_id: tpl.id,
          agent_name: tpl.name,
          selected_channels: channel === 'skip' ? ['api'] : [channel],
          step: 3,
        });
        instId = res.installation_id;
        setProvisioned({
          installationId: instId,
          agentName: tpl.name,
          publishableKey: res.publishable_key || null,
        });
      }

      let sessId = sandboxSessionId;
      if (!sessId) {
        const session = await createSession({ installation_id: instId });
        sessId = session.id;
        setSandboxSessionId(sessId);
      }

      const prompt = chatInput.trim();
      setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
      setChatInput('');

      const reply = await sendMessage(sessId, prompt);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply.content },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sandbox message failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '32px 20px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <TanatMascotIcon size={28} />
            <strong style={{ fontSize: 18 }}>Tanat</strong>
          </Link>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Step {step} of 3 · Resumable Setup
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { num: 1 as const, label: '1. Create workspace' },
            { num: 2 as const, label: '2. Choose AI agent' },
            { num: 3 as const, label: '3. Deploy & test' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => {
                if (item.num <= step || authed) setStep(item.num);
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: step === item.num ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: step === item.num ? 'rgba(13,122,95,0.08)' : '#fff',
                textAlign: 'left',
                fontWeight: step === item.num ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: 16 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ padding: 12, borderRadius: 10, background: '#ecfdf5', color: '#065f46', marginBottom: 16 }}>
            {notice}
          </div>
        )}

        {/* STEP 1: CREATE WORKSPACE */}
        {step === 1 && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <h1 style={{ fontSize: 24, marginBottom: 6 }}>Create your workspace</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Launch your isolated AI workspace in under 3 minutes. Advanced knowledge, team, and privacy settings live in your dashboard.
            </p>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>BUSINESS NAME</label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Acme Logistics"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>INDUSTRY</label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.label}</option>
                  ))}
                </select>
              </div>

              {!authed && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>WORK EMAIL</label>
                  <input
                    type="email"
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="you@company.com"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                  />
                </div>
              )}

              {!authed && otpSent && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>6-DIGIT VERIFICATION CODE</label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => void handleStep1Continue()} disabled={busy}>
                {!authed ? (otpSent ? 'Verify & Continue' : 'Send Verification Code') : 'Continue to Agent Selection'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHOOSE AN AI AGENT */}
        {step === 2 && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <h1 style={{ fontSize: 24, marginBottom: 6 }}>Choose your primary AI agent</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Every template starts with least-privilege permissions and human-in-the-loop safety. You can customize instructions later.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {ONBOARDING_TEMPLATES.map((tpl) => {
                const active = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    style={{
                      textAlign: 'left',
                      padding: 16,
                      borderRadius: 12,
                      border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'rgba(13,122,95,0.06)' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>{tpl.role}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{tpl.name}</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{tpl.description}</p>
                    <ul style={{ fontSize: 12, paddingLeft: 16, margin: '0 0 8px' }}>
                      {tpl.responsibilities.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      <strong>Default guardrails:</strong> {tpl.restrictions}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" onClick={() => void handleStep2Continue()} disabled={busy}>
                Continue to Deploy & Test
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DEPLOY & TEST */}
        {step === 3 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
              <h1 style={{ fontSize: 24, marginBottom: 6 }}>Deploy & test your agent</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                Select an initial channel (or skip for now), test your agent in the sandbox, and publish when ready.
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {(
                  [
                    ['website', 'Website Widget'],
                    ['telegram', 'Telegram'],
                    ['slack', 'Slack'],
                    ['api', 'Developer API / MCP'],
                    ['skip', 'Skip integration for now'],
                  ] as Array<[ChannelChoice, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={channel === id ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setChannel(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {channel === 'website' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    ALLOWED WEBSITE ORIGIN (REQUIRED IN PRODUCTION — NO WILDCARDS)
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="https://www.yourcompany.com"
                    value={websiteOrigin}
                    onChange={(e) => setWebsiteOrigin(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={() => void handleProvisionAndPublish(false)} disabled={busy}>
                  Save Draft & Test in Sandbox
                </button>
                <button className="btn-primary" onClick={() => void handleProvisionAndPublish(true)} disabled={busy}>
                  Publish Agent
                </button>
              </div>
            </div>

            {/* Sandbox */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <h3 style={{ marginBottom: 8 }}>Live Agent Sandbox</h3>
              <div style={{ display: 'grid', gap: 10, maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: m.role === 'user' ? '#f1f5f9' : 'rgba(13,122,95,0.08)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      {m.role === 'user' ? 'You' : provisioned?.agentName ?? 'AI Agent'}
                    </div>
                    <FormattedPreview content={m.content} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSandboxSend();
                  }}
                />
                <button className="btn-primary" onClick={() => void handleSandboxSend()} disabled={busy}>
                  Send
                </button>
              </div>
            </div>

            {provisioned && (
              <div style={{ background: '#fff', border: '2px solid var(--accent)', borderRadius: 16, padding: 24 }}>
                <h2 style={{ fontSize: 20, marginBottom: 6 }}>Your AI agent is ready</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Next steps in your workspace dashboard:
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span className="ws-pill">Add business knowledge</span>
                  <span className="ws-pill">Connect WhatsApp / Telegram / Slack</span>
                  <span className="ws-pill">Add team members & RBAC</span>
                  <span className="ws-pill">Review Privacy & Security Centre</span>
                </div>
                <button className="btn-primary" onClick={() => router.push('/app')}>
                  Open Workspace Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
