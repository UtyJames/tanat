'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo, CheckIcon, ArrowIcon } from '@/components/brand/Logo';
import { ApiError, requestOtp, verifyOtp, completeOnboarding } from '@/lib/api';

type Job = 'support' | 'sales' | 'refunds' | 'bookings' | 'orders';
type Channel = 'website' | 'whatsapp' | 'telegram' | 'api';

const jobs: { id: Job; title: string; note: string; icon: string }[] = [
  { id: 'support', title: 'Answer customers', note: 'Questions, policies, order help', icon: '?' },
  { id: 'sales', title: 'Sell & take payment', note: 'Recommend, quote, check out', icon: '$' },
  { id: 'refunds', title: 'Handle refunds', note: 'Propose, then wait for approval', icon: '↩' },
  { id: 'bookings', title: 'Take bookings', note: 'Tables, slots, deposits', icon: '◷' },
  { id: 'orders', title: 'Order status', note: 'Where is it, when does it arrive', icon: '▤' },
];

const channels: { id: Channel; title: string; note: string; icon: string }[] = [
  { id: 'website', title: 'Website widget', note: 'One script tag. Any site.', icon: '◎' },
  { id: 'whatsapp', title: 'WhatsApp', note: 'Official Cloud API', icon: 'W' },
  { id: 'telegram', title: 'Telegram', note: 'Connect a bot in minutes', icon: 'T' },
  { id: 'api', title: 'Headless API', note: 'Your own interface', icon: '{}' },
];

const tones = ['Friendly', 'Concise', 'Playful', 'Formal'];

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [sells, setSells] = useState('');
  const [agentName, setAgentName] = useState('Store Assistant');
  const [tone, setTone] = useState('Friendly');
  const [selectedJobs, setSelectedJobs] = useState<Job[]>(['support', 'sales']);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['website']);
  const [currency, setCurrency] = useState('USD');
  const [perPayment, setPerPayment] = useState('250');
  const [monthly, setMonthly] = useState('2000');
  const [approver, setApprover] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [result, setResult] = useState<{
    publishableKey: string;
    snippet: string;
    installationId: string;
  } | null>(null);

  const stepNames = ['Business', 'Agent', 'Channels', 'Money', 'Launch'];

  const canContinue = useMemo(() => {
    if (step === 0) return businessName.trim().length >= 2;
    if (step === 1) return agentName.trim().length >= 2 && selectedJobs.length > 0;
    if (step === 2) return selectedChannels.length > 0;
    if (step === 3) return Number(perPayment) > 0 && Number(monthly) > 0;
    return true;
  }, [step, businessName, agentName, selectedJobs, selectedChannels, perPayment, monthly]);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  function next() {
    setError(null);
    if (!canContinue) return;
    if (step < 4) setStep(step + 1);
  }

  async function launch() {
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter a valid work email so we can secure the workspace.');
      return;
    }
    setBusy(true);
    try {
      await requestOtp({ email: email.trim(), tenant_name: businessName.trim() });
      setAwaitingCode(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not send the code. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setError(null);
    if (otpCode.length !== 6) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(email.trim(), otpCode.trim());
      const onboarding = await completeOnboarding({
        business: {
          name: businessName.trim(),
          website: website.trim(),
          sells: sells.trim(),
        },
        agent: {
          name: agentName.trim(),
          tone,
          jobs: selectedJobs,
        },
        channels: selectedChannels,
        money: {
          currency,
          per_payment_cap: Number(perPayment),
          monthly_cap: Number(monthly),
          approver_email: approver.trim() || email.trim(),
        },
      });
      setResult(onboarding);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not finish setup. You can still sign in and continue from settings.',
      );
    } finally {
      setBusy(false);
    }
  }

  const snippet = result?.snippet ?? `<!-- Paste once, anywhere in <body> -->
<script
  src="https://tanat.app/embed/tanat-widget.js"
  data-key="${result?.publishableKey ?? 'pk_test_your_key'}"
  data-agent="${result?.installationId ?? 'inst_your_agent'}"
  data-theme="light"
  defer
></script>`;

  return (
    <div className="start">
      <aside className="start-aside">
        <div className="start-aside-top">
          <Link href="/" aria-label="Tanat home">
            <Logo size={28} tone="bone" />
          </Link>
          <span className="t-pill" style={{ background: 'rgba(201,242,107,.16)', color: '#c9f26b' }}>
            Test mode
          </span>
        </div>

        <h2>Let’s put your agent to work.</h2>
        <p className="start-aside-sub">
          Five short steps. No card, no wallet, no KYC to start. You can run a
          real conversation and approve a test payment before anything goes live.
        </p>

        <div className="start-steps">
          {stepNames.map((name, index) => (
            <div
              key={name}
              className={`start-step ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}
            >
              <span className="start-step-num">
                {index < step ? <CheckIcon size={11} /> : index + 1}
              </span>
              {name}
            </div>
          ))}
        </div>

        <div className="start-aside-foot">
          <div>✓ Human approval on every payment</div>
          <div style={{ marginTop: 6 }}>✓ Non-custodial · audit trail included</div>
        </div>
      </aside>

      <main className="start-main">
        <div className="start-top">
          <span>Setup · {step + 1} of 5</span>
          <Link href="/login">Already have a workspace? Sign in</Link>
        </div>

        <div className="start-card">
          <div className="start-progress" aria-hidden="true">
            {stepNames.map((name, index) => (
              <i key={name} className={index <= step ? 'done' : ''} />
            ))}
          </div>

          {result ? (
            <LaunchDone
              result={result}
              snippet={snippet}
              selectedChannels={selectedChannels}
              agentName={agentName}
              onOpen={() => router.push('/app')}
            />
          ) : (
            <>
              {step === 0 && (
                <>
                  <span className="t-eyebrow">Step 1 · Business</span>
                  <h1 style={{ marginTop: 16 }}>Who are we working for?</h1>
                  <p>
                    We use this to draft your agent’s knowledge and tone. You can
                    change everything later.
                  </p>

                  <div className="start-field">
                    <label htmlFor="business-name">Business name</label>
                    <input
                      id="business-name"
                      className="start-input"
                      placeholder="Acme Store"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="start-row">
                    <div className="start-field">
                      <label htmlFor="website">
                        Website <span className="hint">optional</span>
                      </label>
                      <input
                        id="website"
                        className="start-input"
                        placeholder="acme.store"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </div>
                    <div className="start-field">
                      <label htmlFor="sells">
                        What do you sell? <span className="hint">optional</span>
                      </label>
                      <input
                        id="sells"
                        className="start-input"
                        placeholder="Homeware, lamps, gifts"
                        value={sells}
                        onChange={(event) => setSells(event.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <span className="t-eyebrow">Step 2 · Your agent</span>
                  <h1 style={{ marginTop: 16 }}>Give it a name and a job.</h1>
                  <p>
                    The best agents are narrow. Pick the jobs this one should own;
                    you can add more agents later.
                  </p>

                  <div className="start-row">
                    <div className="start-field">
                      <label htmlFor="agent-name">Agent name</label>
                      <input
                        id="agent-name"
                        className="start-input"
                        value={agentName}
                        onChange={(event) => setAgentName(event.target.value)}
                      />
                    </div>
                    <div className="start-field">
                      <label htmlFor="tone">Tone</label>
                      <select
                        id="tone"
                        className="start-select"
                        value={tone}
                        onChange={(event) => setTone(event.target.value)}
                      >
                        {tones.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label style={{ display: 'block', margin: '8px 0 8px', fontSize: 12, fontWeight: 650 }}>
                    What should it handle?
                  </label>
                  <div className="start-choices">
                    {jobs.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        className={`start-choice ${selectedJobs.includes(job.id) ? 'selected' : ''}`}
                        onClick={() => setSelectedJobs((list) => toggle(list, job.id))}
                      >
                        <span className="start-choice-icon">{job.icon}</span>
                        <span>
                          <strong>{job.title}</strong>
                          <span>{job.note}</span>
                        </span>
                        <span className="start-choice-check">
                          <CheckIcon size={10} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <span className="t-eyebrow">Step 3 · Channels</span>
                  <h1 style={{ marginTop: 16 }}>Where should it live?</h1>
                  <p>
                    Pick one to start. The same agent and approval rules work on
                    every channel — you can turn the rest on later.
                  </p>

                  <div className="start-choices">
                    {channels.map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        className={`start-choice ${selectedChannels.includes(channel.id) ? 'selected' : ''}`}
                        onClick={() =>
                          setSelectedChannels((list) =>
                            list.includes(channel.id)
                              ? list.filter((item) => item !== channel.id)
                              : [...list, channel.id],
                          )
                        }
                      >
                        <span className="start-choice-icon">{channel.icon}</span>
                        <span>
                          <strong>{channel.title}</strong>
                          <span>{channel.note}</span>
                        </span>
                        <span className="start-choice-check">
                          <CheckIcon size={10} />
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="start-preview">
                    <div className="start-preview-top">
                      <span>Preview</span>
                      <span>{businessName || 'Your business'}</span>
                    </div>
                    <div className="start-preview-body">
                      <div className="t-bubble t-bubble-agent">
                        Hi — I’m {agentName}. I can help with{' '}
                        {selectedJobs.length > 0
                          ? selectedJobs.map((job) => jobs.find((item) => item.id === job)?.title.toLowerCase()).join(', ')
                          : 'your customers'}
                        . Payments need your approval.
                      </div>
                      <div className="t-bubble t-bubble-user">Can you take a deposit?</div>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <span className="t-eyebrow">Step 4 · Money rules</span>
                  <h1 style={{ marginTop: 16 }}>Set the guardrails.</h1>
                  <p>
                    These are hard limits. The agent can propose anything inside
                    them; a human still approves before money moves.
                  </p>

                  <div className="start-row">
                    <div className="start-field">
                      <label htmlFor="currency">Currency</label>
                      <select
                        id="currency"
                        className="start-select"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                      >
                        {['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'NEAR'].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="start-field">
                      <label htmlFor="per-payment">Max per payment</label>
                      <input
                        id="per-payment"
                        className="start-input"
                        inputMode="decimal"
                        value={perPayment}
                        onChange={(event) => setPerPayment(event.target.value.replace(/[^\d.]/g, ''))}
                      />
                    </div>
                  </div>

                  <div className="start-row">
                    <div className="start-field">
                      <label htmlFor="monthly">Monthly cap</label>
                      <input
                        id="monthly"
                        className="start-input"
                        inputMode="decimal"
                        value={monthly}
                        onChange={(event) => setMonthly(event.target.value.replace(/[^\d.]/g, ''))}
                      />
                    </div>
                    <div className="start-field">
                      <label htmlFor="approver">
                        Who approves? <span className="hint">email</span>
                      </label>
                      <input
                        id="approver"
                        className="start-input"
                        placeholder="owner@company.com"
                        value={approver}
                        onChange={(event) => setApprover(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="start-preview">
                    <div className="start-preview-top">
                      <span>Policy preview</span>
                      <span>Test mode</span>
                    </div>
                    <div className="start-preview-body">
                      <div className="t-bubble t-bubble-agent">
                        Under {currency} {perPayment || '0'} → proposal goes to{' '}
                        {approver || 'the workspace owner'}.
                      </div>
                      <div className="t-bubble t-bubble-agent">
                        Above {currency} {perPayment || '0'} → still allowed, but
                        flagged high risk. Monthly ceiling {currency}{' '}
                        {monthly || '0'}.
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <span className="t-eyebrow">Step 5 · Launch</span>
                  <h1 style={{ marginTop: 16 }}>Ready. Let’s secure it.</h1>
                  <p>
                    We’ll create the workspace, provision your agent, and issue a
                    test publishable key. Real money stays off until you add a
                    payout account.
                  </p>

                  <div className="start-launch-grid">
                    <div className="start-launch-item">
                      <strong>{businessName || 'Your business'}</strong>
                      {website || 'No website yet'}
                    </div>
                    <div className="start-launch-item">
                      <strong>{agentName}</strong>
                      {tone} · {selectedJobs.length} job{selectedJobs.length === 1 ? '' : 's'}
                    </div>
                    <div className="start-launch-item">
                      <strong>{selectedChannels.length} channel{selectedChannels.length === 1 ? '' : 's'}</strong>
                      {selectedChannels.map((item) => channels.find((channel) => channel.id === item)?.title).join(', ')}
                    </div>
                    <div className="start-launch-item">
                      <strong>{currency} {perPayment} / payment</strong>
                      {currency} {monthly} monthly cap
                    </div>
                  </div>

                  <div className="start-field">
                    <label htmlFor="launch-email">Work email</label>
                    <input
                      id="launch-email"
                      className="start-input"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={awaitingCode}
                      autoFocus
                    />
                    <div className="start-hint">
                      We send a six-digit code. No password. No wallet seed phrase.
                    </div>
                  </div>

                  {awaitingCode && (
                    <div className="start-field">
                      <label htmlFor="launch-code">Six-digit code</label>
                      <input
                        id="launch-code"
                        className="start-input"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(event) =>
                          setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        autoFocus
                      />
                      <div className="start-hint">
                        Sent to {email.trim()}. It expires in 10 minutes.
                      </div>
                    </div>
                  )}

                  <div className="start-done">
                    <span className="start-done-icon">
                      <CheckIcon size={16} />
                    </span>
                    <span>
                      <strong>Test mode is on by default.</strong>
                      <span>Every payment is simulated until you connect a payout account.</span>
                    </span>
                  </div>
                </>
              )}

              {error && <div className="start-error">{error}</div>}

              <div className="start-actions">
                {step > 0 ? (
                  <button
                    className="start-back"
                    type="button"
                    onClick={() => {
                      setAwaitingCode(false);
                      setOtpCode('');
                      setError(null);
                      setStep(step - 1);
                    }}
                  >
                    ← Back
                  </button>
                ) : (
                  <span className="start-hint">Takes about 3 minutes</span>
                )}

                {step < 4 ? (
                  <button
                    className="t-btn t-btn-ink"
                    type="button"
                    onClick={next}
                    disabled={!canContinue}
                  >
                    Continue <ArrowIcon />
                  </button>
                ) : awaitingCode ? (
                  <button
                    className="t-btn t-btn-lime"
                    type="button"
                    onClick={() => void finish()}
                    disabled={busy || otpCode.length !== 6}
                  >
                    {busy ? 'Creating…' : 'Verify & launch'}
                    {!busy && <ArrowIcon />}
                  </button>
                ) : (
                  <button
                    className="t-btn t-btn-lime"
                    type="button"
                    onClick={() => void launch()}
                    disabled={busy}
                  >
                    {busy ? 'Sending…' : 'Create workspace'}
                    {!busy && <ArrowIcon />}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function LaunchDone({
  result,
  snippet,
  selectedChannels,
  agentName,
  onOpen,
}: {
  result: { publishableKey: string; snippet: string; installationId: string };
  snippet: string;
  selectedChannels: Channel[];
  agentName: string;
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const channelLabels = selectedChannels
    .map((id) => channels.find((channel) => channel.id === id)?.title ?? id)
    .join(', ');

  return (
    <>
      <span className="t-eyebrow">You’re in</span>
      <h1 style={{ marginTop: 16 }}>{agentName} is live in test mode.</h1>
      <p>
        Paste this snippet into your site’s <code>&lt;body&gt;</code>. It works on
        any stack — plain HTML, Shopify, WordPress, or your vibecoded app.
      </p>

      <div className="start-snippet">{snippet}</div>

      <div className="start-launch-grid">
        <div className="start-launch-item">
          <strong>Publishable key</strong>
          {result.publishableKey}
        </div>
        <div className="start-launch-item">
          <strong>Agent</strong>
          {agentName}
        </div>
        <div className="start-launch-item">
          <strong>Channels</strong>
          {channels.map((item) => channels.find((channel) => channel.id === item)?.title ?? item).join(', ')}
        </div>
        <div className="start-launch-item">
          <strong>Status</strong>
          Test mode · no real money
        </div>
      </div>

      <div className="start-actions">
        <button className="start-back" type="button" onClick={() => void copy()}>
          {copied ? 'Copied ✓' : 'Copy snippet'}
        </button>
        <button className="t-btn t-btn-lime" type="button" onClick={onOpen}>
          Open dashboard <ArrowIcon />
        </button>
      </div>

      <p className="start-hint" style={{ marginTop: 18 }}>
        Next: run a test conversation, then connect a payout account to go live.
        Your test key starts with <code>pk_test_</code>.
      </p>
    </>
  );
}
