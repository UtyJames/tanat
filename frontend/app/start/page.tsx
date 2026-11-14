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
import {
  CursorLogo,
  LovableLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WebflowLogo,
} from '@/components/brand/PlatformLogos';

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

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--tn-font-mono)',
  fontSize: 11.5,
  letterSpacing: '0.08em',
  color: 'var(--tn-muted)',
  marginBottom: 6,
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  height: 46,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid var(--tn-border-strong)',
  background: 'var(--tn-bg)',
  color: 'var(--tn-ink)',
  fontSize: 15,
  outline: 'none',
};

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

  // Pre-fill email when redirected from /login & restore resumable onboarding state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prefillEmail = params.get('email')?.trim();
      if (prefillEmail) {
        setWorkEmail(prefillEmail);
        setNotice(
          `No account was found for ${prefillEmail}. Complete this 3-step setup to create your workspace.`,
        );
      }
    }

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

  async function handleStep1Continue(event?: React.FormEvent) {
    event?.preventDefault();
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
          await requestOtp({
            email: workEmail.trim(),
            tenant_name: businessName.trim(),
            mode: 'signup',
          });
          setOtpSent(true);
          setNotice(`We sent a six-digit verification code to ${workEmail.trim()}. It expires in 10 minutes.`);
        } else {
          await verifyOtp(workEmail.trim(), otpCode.trim(), 'signup');
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
    <div className="tn-site tn-split-layout">
      {/* Left Hero-Matched Grainy Emerald Panel with Floating Logos */}
      <aside
        className="tn-near-grain"
        style={{
          padding: '36px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--tn-border)',
          position: 'relative',
        }}
      >
        <div className="tn-hero-wireframe" />
        <span className="tn-pushpin tn-pushpin-left" aria-hidden="true" />
        <span className="tn-pushpin tn-pushpin-right" aria-hidden="true" />
        <div className="tn-pixel-corner" style={{ top: 18, left: 64 }} aria-hidden="true" />
        <div className="tn-pixel-corner" style={{ bottom: 18, right: 64 }} aria-hidden="true" />

        {/* Floating Animated Platform Logos */}
        <div
          className="tn-float-badge"
          style={{ right: 44, top: 86, animation: 'tn-float-b 5.6s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <LovableLogo size={24} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 112, top: 162, animation: 'tn-float-a 6.2s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <SlackLogo size={24} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 48, bottom: 130, animation: 'tn-float-a 5.8s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <TelegramLogo size={24} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 124, bottom: 72, animation: 'tn-float-b 6.5s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <WebflowLogo size={22} />
        </div>
        <div
          className="tn-float-badge"
          style={{ left: 42, bottom: 120, animation: 'tn-float-b 6.1s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <CursorLogo size={22} />
        </div>

        <Link
          href="/"
          className="tn-brand"
          style={{ color: '#ffffff', position: 'relative', zIndex: 2 }}
        >
          <TanatMascotIcon size={36} />
          <span>Tanat</span>
        </Link>

        <div style={{ maxWidth: 440, position: 'relative', zIndex: 2, margin: '48px 0' }}>
          <span className="tn-eyebrow" style={{ color: '#00ec97' }}>
            3-STEP WORKSPACE SETUP
          </span>
          <h2
            className="tn-h2"
            style={{ color: '#ffffff', marginTop: 12, fontSize: 'clamp(28px, 3vw, 38px)' }}
          >
            Launch your private AI workspace in minutes.
          </h2>
          <p style={{ marginTop: 14, color: 'rgba(255,255,255,0.82)', fontSize: 15 }}>
            Each business receives an isolated tenant boundary, tenant-scoped
            AES-256-GCM encryption, and human-in-the-loop approvals out of the
            box.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            fontFamily: 'var(--tn-font-mono)',
            fontSize: 11.5,
            color: '#00ec97',
            borderTop: '1px dashed rgba(255,255,255,0.2)',
            paddingTop: 18,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span>✓ Tenant-isolated data</span>
          <span>✓ Resumable setup</span>
          <span>✓ NEAR AI Cloud</span>
        </div>
      </aside>

      {/* Right Architectural Form Panel */}
      <main
        style={{
          display: 'grid',
          placeItems: 'center',
          padding: '40px 28px',
          background: 'var(--tn-bg)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: step === 2 ? 720 : 520,
            background: '#ffffff',
            borderRadius: 22,
            border: '1px solid var(--tn-border)',
            padding: 36,
            boxShadow: '0 20px 50px -28px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span className="tn-eyebrow">STEP {step} OF 3 · RESUMABLE SETUP</span>
            <span
              style={{
                fontFamily: 'var(--tn-font-mono)',
                fontSize: 11,
                letterSpacing: '0.06em',
                color: 'var(--tn-muted)',
              }}
            >
              {authed ? 'WORKSPACE VERIFIED' : 'NEW ACCOUNT'}
            </span>
          </div>

          {/* Step Switcher Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginTop: 16,
              marginBottom: 20,
            }}
          >
            {[
              { num: 1 as const, label: '1. Workspace' },
              { num: 2 as const, label: '2. AI Agent' },
              { num: 3 as const, label: '3. Deploy' },
            ].map((item) => {
              const active = step === item.num;
              const unlocked = item.num <= step || authed;
              return (
                <button
                  key={item.num}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked) setStep(item.num);
                  }}
                  style={{
                    padding: '9px 10px',
                    borderRadius: 10,
                    border: active
                      ? '1.5px solid var(--tn-emerald)'
                      : '1px solid var(--tn-border-strong)',
                    background: active ? 'rgba(0, 201, 128, 0.1)' : 'var(--tn-bg)',
                    color: active ? 'var(--tn-ink)' : 'var(--tn-muted)',
                    fontFamily: 'var(--tn-font-mono)',
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    letterSpacing: '0.04em',
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    opacity: unlocked ? 1 : 0.6,
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px dashed var(--tn-border-strong)', margin: '0 0 22px' }} />

          {/* STEP 1: CREATE WORKSPACE */}
          {step === 1 && (
            <form
              onSubmit={(event) => void handleStep1Continue(event)}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <h1 className="tn-h2" style={{ fontSize: 30 }}>
                  Create your workspace
                </h1>
                <p className="tn-sec-desc" style={{ marginTop: 8, fontSize: 14.5 }}>
                  Enter your business details and verify your work email to launch your
                  isolated workspace.
                </p>
              </div>

              <div>
                <label htmlFor="start-business" style={fieldLabelStyle}>
                  BUSINESS NAME
                </label>
                <input
                  id="start-business"
                  type="text"
                  placeholder="e.g. Acme Logistics"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  style={fieldInputStyle}
                />
              </div>

              <div>
                <label htmlFor="start-industry" style={fieldLabelStyle}>
                  INDUSTRY
                </label>
                <select
                  id="start-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  style={fieldInputStyle}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              {!authed && (
                <div>
                  <label htmlFor="start-email" style={fieldLabelStyle}>
                    WORK EMAIL
                  </label>
                  <input
                    id="start-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    required
                    style={fieldInputStyle}
                  />
                </div>
              )}

              {!authed && otpSent && (
                <div>
                  <label htmlFor="start-otp" style={fieldLabelStyle}>
                    SIX-DIGIT VERIFICATION CODE
                  </label>
                  <input
                    id="start-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    autoFocus
                    style={{
                      ...fieldInputStyle,
                      fontSize: 18,
                      letterSpacing: '0.2em',
                      fontFamily: 'var(--tn-font-mono)',
                    }}
                  />
                </div>
              )}

              <button
                className="tn-btn tn-btn-white"
                type="submit"
                disabled={busy}
                style={{ width: '100%', height: 46, marginTop: 4 }}
              >
                {busy
                  ? 'Working…'
                  : !authed
                    ? otpSent
                      ? 'Verify & continue →'
                      : 'Send verification code →'
                    : 'Continue to AI agent →'}
              </button>

              {!authed && otpSent && (
                <button
                  type="button"
                  className="tn-btn tn-btn-beige"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setError(null);
                    setNotice(null);
                  }}
                  style={{ width: '100%', height: 42 }}
                >
                  Use a different email
                </button>
              )}
            </form>
          )}

          {/* STEP 2: CHOOSE AN AI AGENT */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h1 className="tn-h2" style={{ fontSize: 30 }}>
                  Choose your primary AI agent
                </h1>
                <p className="tn-sec-desc" style={{ marginTop: 8, fontSize: 14.5 }}>
                  Every template starts with least-privilege permissions and
                  human-in-the-loop safety. You can customize instructions later.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
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
                        borderRadius: 14,
                        border: active
                          ? '1.5px solid var(--tn-emerald)'
                          : '1px solid var(--tn-border-strong)',
                        background: active ? 'rgba(0, 201, 128, 0.08)' : 'var(--tn-bg)',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--tn-font-mono)',
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          color: 'var(--tn-emerald)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tpl.role}
                      </div>
                      <div style={{ fontSize: 15.5, fontWeight: 700, margin: '4px 0', color: 'var(--tn-ink)' }}>
                        {tpl.name}
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--tn-muted)', marginBottom: 8, lineHeight: 1.45 }}>
                        {tpl.description}
                      </p>
                      <ul style={{ fontSize: 12, paddingLeft: 16, margin: '0 0 8px', color: 'var(--tn-ink)' }}>
                        {tpl.responsibilities.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      <div style={{ fontSize: 11, color: 'var(--tn-muted)', lineHeight: 1.4 }}>
                        <strong>Guardrails:</strong> {tpl.restrictions}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 4 }}>
                <button
                  type="button"
                  className="tn-btn tn-btn-beige"
                  onClick={() => setStep(1)}
                  style={{ height: 44 }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="tn-btn tn-btn-white"
                  onClick={() => void handleStep2Continue()}
                  disabled={busy}
                  style={{ height: 44, flex: 1 }}
                >
                  Continue to deploy & test →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DEPLOY & TEST */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h1 className="tn-h2" style={{ fontSize: 30 }}>
                  Deploy & test your agent
                </h1>
                <p className="tn-sec-desc" style={{ marginTop: 8, fontSize: 14.5 }}>
                  Pick an initial channel (or skip for now), test your agent in the
                  live sandbox, and publish when ready.
                </p>
              </div>

              <div>
                <span style={fieldLabelStyle}>INITIAL CHANNEL</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(
                    [
                      ['website', 'Website Widget'],
                      ['telegram', 'Telegram'],
                      ['slack', 'Slack'],
                      ['api', 'Developer API / MCP'],
                      ['skip', 'Skip for now'],
                    ] as Array<[ChannelChoice, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`tn-btn ${channel === id ? 'tn-btn-white' : 'tn-btn-beige'}`}
                      style={{ height: 38, padding: '0 14px', fontSize: 13 }}
                      onClick={() => setChannel(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {channel === 'website' && (
                <div>
                  <label htmlFor="start-origin" style={fieldLabelStyle}>
                    ALLOWED WEBSITE ORIGIN (NO WILDCARDS)
                  </label>
                  <input
                    id="start-origin"
                    type="url"
                    placeholder="https://www.yourcompany.com"
                    value={websiteOrigin}
                    onChange={(e) => setWebsiteOrigin(e.target.value)}
                    style={fieldInputStyle}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="tn-btn tn-btn-beige"
                  onClick={() => void handleProvisionAndPublish(false)}
                  disabled={busy}
                  style={{ height: 44, flex: 1 }}
                >
                  Save Draft & Test
                </button>
                <button
                  type="button"
                  className="tn-btn tn-btn-white"
                  onClick={() => void handleProvisionAndPublish(true)}
                  disabled={busy}
                  style={{ height: 44, flex: 1 }}
                >
                  Publish Agent →
                </button>
              </div>

              {/* Live Agent Sandbox */}
              <div
                style={{
                  border: '1px solid var(--tn-border-strong)',
                  borderRadius: 14,
                  background: 'var(--tn-bg)',
                  padding: 16,
                }}
              >
                <span style={fieldLabelStyle}>LIVE AGENT SANDBOX</span>
                {messages.length > 0 && (
                  <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid var(--tn-border)',
                          background: m.role === 'user' ? '#ffffff' : 'rgba(0, 201, 128, 0.08)',
                          fontSize: 13.5,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--tn-font-mono)',
                            fontSize: 10.5,
                            fontWeight: 700,
                            marginBottom: 4,
                            color: 'var(--tn-muted)',
                          }}
                        >
                          {m.role === 'user' ? 'YOU' : (provisioned?.agentName ?? 'AI AGENT').toUpperCase()}
                        </div>
                        <FormattedPreview content={m.content} />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...fieldInputStyle, background: '#ffffff', flex: 1, height: 42 }}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSandboxSend();
                    }}
                  />
                  <button
                    type="button"
                    className="tn-btn tn-btn-white"
                    onClick={() => void handleSandboxSend()}
                    disabled={busy}
                    style={{ height: 42, padding: '0 18px' }}
                  >
                    Send
                  </button>
                </div>
              </div>

              {provisioned && (
                <div
                  style={{
                    border: '1.5px solid var(--tn-emerald)',
                    borderRadius: 14,
                    background: '#ecfdf5',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#065f46' }}>
                    ✓ {provisioned.agentName} is ready
                  </div>
                  <button
                    type="button"
                    className="tn-btn tn-btn-white"
                    onClick={() => router.push('/app')}
                    style={{ width: '100%', height: 44 }}
                  >
                    Open Workspace Dashboard →
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="tn-btn tn-btn-beige"
                  onClick={() => setStep(2)}
                  style={{ height: 38, padding: '0 14px', fontSize: 13 }}
                >
                  ← Back to agent templates
                </button>
              </div>
            </div>
          )}

          {notice && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 12,
                background: '#ecfdf5',
                border: '1px solid #00c980',
                fontSize: 13,
                color: '#065f46',
              }}
            >
              {notice}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 12,
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                fontSize: 13,
                color: '#991b1b',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              borderTop: '1px dashed var(--tn-border-strong)',
              marginTop: 24,
              paddingTop: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              color: 'var(--tn-muted)',
            }}
          >
            <span>Already have a workspace?</span>
            <Link href="/login" style={{ fontWeight: 600, color: 'var(--tn-emerald)' }}>
              Sign in →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
