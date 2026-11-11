'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ApiError,
  API_URL,
  configureIntegration,
  createAgent,
  createInstallation,
  createKnowledge,
  createMemory,
  createPublishableKey,
  createVerifiedUserToken,
  deleteKnowledge,
  deleteMemory,
  getAgentTemplates,
  getAnalytics,
  getStoredKey,
  getTenant,
  inviteMember,
  listActions,
  listAgents,
  listAgentVersions,
  listChannels,
  listInstallations,
  listIntegrations,
  listKnowledge,
  listMembers,
  listMemories,
  listPublishableKeys,
  listRuns,
  PUBLIC_BASE_URL,
  removeMember,
  revokeDashboardSession,
  revokePublishableKey,
  updateAgent,
  updateAgentLifecycle,
  updateChannelStatus,
  updateInstallation,
} from '@/lib/api';
import type {
  Agent,
  AgentChannel,
  AgentRun,
  AgentTemplate,
  AgentVersion,
  CustomerMemory,
  Installation,
  IntegrationCatalogueItem,
  KnowledgeSource,
  PublishableKey,
  Tenant,
  WorkspaceAnalytics,
  WorkspaceMember,
} from '@/lib/types';
import { Logo } from '@/components/brand/Logo';
import Chat from '@/components/Chat';
import ActionsList from '@/components/ActionsList';
import Settings from '@/components/Settings';

type Section =
  | 'overview'
  | 'agents'
  | 'knowledge'
  | 'channels'
  | 'integrations'
  | 'conversations'
  | 'activity'
  | 'analytics'
  | 'team'
  | 'developers'
  | 'settings';

type AgentDetailTab =
  | 'overview'
  | 'instructions'
  | 'knowledge'
  | 'permissions'
  | 'channels'
  | 'memory'
  | 'testing'
  | 'versions';

export default function Dashboard() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [pendingActions, setPendingActions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keyHint, setKeyHint] = useState('');

  // Workspace data
  const [agents, setAgents] = useState<Agent[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeSource[]>([]);
  const [memories, setMemories] = useState<CustomerMemory[]>([]);
  const [channels, setChannels] = useState<AgentChannel[]>([]);
  const [pubKeys, setPubKeys] = useState<PublishableKey[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationCatalogueItem[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Agent Detail state
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentTab, setAgentTab] = useState<AgentDetailTab>('overview');
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>([]);
  const [editPrompt, setEditPrompt] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [newAgentTemplateId, setNewAgentTemplateId] = useState('tpl_customer_support');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');

  // Knowledge & Memory form state
  const [knType, setKnType] = useState<
    'website' | 'faq' | 'document' | 'pdf' | 'text' | 'catalog' | 'policy'
  >('policy');
  const [knTitle, setKnTitle] = useState('');
  const [knUrl, setKnUrl] = useState('');
  const [knContent, setKnContent] = useState('');
  const [knAgentId, setKnAgentId] = useState<string>('');
  const [memUserId, setMemUserId] = useState('customer_01');
  const [memKey, setMemKey] = useState('');
  const [memValue, setMemValue] = useState('');

  // Channels / Widget installer state
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [widgetTheme, setWidgetTheme] = useState<'light' | 'dark'>('light');
  const [widgetAccent, setWidgetAccent] = useState('#0C0D0B');
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left'>(
    'bottom-right',
  );
  const [widgetWelcome, setWidgetWelcome] = useState(
    'Hi! How can I help you today?',
  );
  const [widgetOrigins, setWidgetOrigins] = useState('http://localhost:3000');

  // Activity sub-tab
  const [activityTab, setActivityTab] = useState<'approvals' | 'runs'>('approvals');

  // Team form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'operator' | 'viewer'>(
    'operator',
  );

  // Developer HMAC generator state
  const [verifyUserId, setVerifyUserId] = useState('user_4821');
  const [verifiedTokenResult, setVerifiedTokenResult] = useState<{
    user_id: string;
    user_signature: string;
  } | null>(null);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    try {
      const loadedTenant = await getTenant();
      setTenant(loadedTenant);
      const key = getStoredKey();
      setKeyHint(key ? `${key.slice(0, 9)}…${key.slice(-4)}` : '');

      const [
        agentsRes,
        instRes,
        tplRes,
        knRes,
        memRes,
        chRes,
        pkRes,
        intRes,
        runsRes,
        anRes,
        memListRes,
        actRes,
      ] = await Promise.all([
        listAgents().catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 20 } })),
        listInstallations().catch(() => []),
        getAgentTemplates().catch(() => ({ industries: [], templates: [] })),
        listKnowledge().catch(() => []),
        listMemories().catch(() => []),
        listChannels().catch(() => []),
        listPublishableKeys().catch(() => []),
        listIntegrations().catch(() => []),
        listRuns().catch(() => []),
        getAnalytics().catch(() => null),
        listMembers().catch(() => []),
        listActions('pending').catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 20 } })),
      ]);

      setAgents(agentsRes.data);
      setInstallations(instRes);
      if (instRes[0] && !selectedInstId) {
        setSelectedInstId(instRes[0].id);
      }
      setTemplates(tplRes.templates);
      setKnowledge(knRes);
      setMemories(memRes);
      setChannels(chRes);
      setPubKeys(pkRes);
      setIntegrations(intRes);
      setRuns(runsRes);
      setAnalytics(anRes);
      setMembers(memListRes);
      setPendingActions(actRes.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load workspace.');
    } finally {
      setBooting(false);
    }
  }, [selectedInstId]);

  useEffect(() => {
    if (!getStoredKey()) {
      router.replace('/login');
      return;
    }
    void loadWorkspace();
  }, [loadWorkspace, router]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  useEffect(() => {
    if (!selectedAgent) return;
    setEditPrompt(selectedAgent.system_prompt);
    setEditDescription(selectedAgent.description ?? '');
    void listAgentVersions(selectedAgent.id)
      .then(setAgentVersions)
      .catch(() => setAgentVersions([]));
  }, [selectedAgent]);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3200);
  }

  async function signOut() {
    await revokeDashboardSession();
    router.replace('/login');
  }

  async function handleCreateAgentFromTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tpl = templates.find((t) => t.id === newAgentTemplateId);
    const name = newAgentName.trim() || tpl?.name || 'Business Agent';
    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now().toString(36).slice(-4)}`;
    try {
      const created = await createAgent({
        name,
        slug,
        description: newAgentDescription.trim() || tpl?.description || 'Specialized business AI agent',
        system_prompt:
          tpl?.system_prompt_template ||
          `You are the ${name} for ${tenant?.name ?? 'our business'}.\nAnswer accurately using approved business knowledge and escalate sensitive actions for human review.`,
        config: {
          template_id: tpl?.id ?? 'tpl_custom',
          category: tpl?.category ?? 'custom',
          tone: tpl?.default_tone ?? 'professional',
          lifecycle: 'published',
        },
      });
      await createInstallation({
        agent_id: created.id,
        config: {
          welcome_message: `Hi! I'm the ${name}. How can I help you today?`,
          brand_color: '#0C0D0B',
        },
      });
      setShowNewAgentModal(false);
      setNewAgentName('');
      setNewAgentDescription('');
      await loadWorkspace();
      setSelectedAgentId(created.id);
      flash(`Created agent "${created.name}".`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create agent.');
    }
  }

  async function handleSaveAgentInstructions() {
    if (!selectedAgent) return;
    try {
      await updateAgent(selectedAgent.id, {
        description: editDescription,
        system_prompt: editPrompt,
      });
      await updateAgentLifecycle(selectedAgent.id, {
        lifecycle: 'published',
        change_summary: 'Updated instructions and system prompt',
      });
      await loadWorkspace();
      const vers = await listAgentVersions(selectedAgent.id);
      setAgentVersions(vers);
      flash('Saved agent instructions and created a new version snapshot.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save agent.');
    }
  }

  async function handleLifecycleChange(
    agentId: string,
    lifecycle: 'draft' | 'testing' | 'published' | 'paused',
  ) {
    try {
      await updateAgentLifecycle(agentId, {
        lifecycle,
        change_summary: `Switched lifecycle state to ${lifecycle}`,
      });
      await loadWorkspace();
      flash(`Agent state updated to ${lifecycle}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update lifecycle.');
    }
  }

  async function handleAddKnowledge(e: React.FormEvent) {
    e.preventDefault();
    if (!knTitle.trim() || !knContent.trim()) return;
    try {
      await createKnowledge({
        agent_id: knAgentId || null,
        source_type: knType,
        title: knTitle.trim(),
        url: knUrl.trim() || undefined,
        content: knContent.trim(),
      });
      setKnTitle('');
      setKnUrl('');
      setKnContent('');
      await loadWorkspace();
      flash('Added knowledge source to workspace.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add knowledge.');
    }
  }

  async function handleAddMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!memUserId.trim() || !memKey.trim() || !memValue.trim()) return;
    try {
      await createMemory({
        user_id: memUserId.trim(),
        key: memKey.trim(),
        value: memValue.trim(),
        memory_type: 'fact',
      });
      setMemKey('');
      setMemValue('');
      await loadWorkspace();
      flash('Saved customer memory fact.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save memory.');
    }
  }

  async function handleGeneratePublishableKey() {
    const instId = selectedInstId || installations[0]?.id;
    if (!instId) {
      setError('Create an agent installation first.');
      return;
    }
    try {
      const origins = widgetOrigins
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await createPublishableKey({
        installation_id: instId,
        name: 'Website Widget Key',
        allowed_origins: origins.length ? origins : ['http://localhost:3000'],
      });
      await updateInstallation(instId, {
        config: {
          theme: widgetTheme,
          brand_color: widgetAccent,
          position: widgetPosition,
          welcome_message: widgetWelcome,
        },
      });
      await loadWorkspace();
      flash('Generated publishable key and updated widget configuration.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create publishable key.');
    }
  }

  function launchLiveWidgetPreview() {
    const activePk =
      pubKeys.find((k) => k.installation_id === selectedInstId && k.is_active) ??
      pubKeys.find((k) => k.is_active);
    const instId = selectedInstId || installations[0]?.id;
    if (!activePk || !instId) {
      setError('Generate a publishable key first to launch the live widget preview.');
      return;
    }

    const existing = document.getElementById('tanat-widget-root');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = `/embed/tanat-widget.js?t=${Date.now()}`;
    script.setAttribute('data-key', activePk.key_value);
    script.setAttribute('data-agent', instId);
    script.setAttribute('data-api', PUBLIC_BASE_URL);
    script.setAttribute('data-theme', widgetTheme);
    script.setAttribute('data-accent', widgetAccent);
    script.setAttribute('data-position', widgetPosition);
    script.setAttribute('data-welcome', widgetWelcome);
    document.body.appendChild(script);
    window.setTimeout(() => {
      const win = window as unknown as { TanatWidget?: { open: () => void } };
      win.TanatWidget?.open();
    }, 350);
    flash('Launched live widget in the bottom corner of this page.');
  }

  const activePubKey = useMemo(
    () =>
      pubKeys.find((k) => k.installation_id === selectedInstId && k.is_active) ??
      pubKeys.find((k) => k.is_active),
    [pubKeys, selectedInstId],
  );

  const activeInstId = selectedInstId || installations[0]?.id || 'inst_your_agent';
  const activePkValue = activePubKey?.key_value || 'pk_live_your_key';

  const htmlWidgetSnippet = `<script
  src="${PUBLIC_BASE_URL}/embed/tanat-widget.js"
  data-key="${activePkValue}"
  data-agent="${activeInstId}"
  data-api="${PUBLIC_BASE_URL}"
  data-theme="${widgetTheme}"
  data-accent="${widgetAccent}"
  data-position="${widgetPosition}"
  data-welcome="${widgetWelcome}"
  defer
></script>`;

  const reactWidgetSnippet = `import Script from 'next/script';

export function TanatChatWidget() {
  return (
    <Script
      src="${PUBLIC_BASE_URL}/embed/tanat-widget.js"
      data-key="${activePkValue}"
      data-agent="${activeInstId}"
      data-api="${PUBLIC_BASE_URL}"
      data-theme="${widgetTheme}"
      strategy="afterInteractive"
    />
  );
}`;

  const vibecoderPrompt = `Read ${PUBLIC_BASE_URL}/llms.txt and ${PUBLIC_BASE_URL}/api/mcp
Integrate our Tanat AI agent for "${tenant?.name ?? 'our business'}" into this app:
- Publishable Key: ${activePkValue}
- Installation ID: ${activeInstId}
- API Base URL: ${PUBLIC_BASE_URL}

Option A (Website Widget): Add this script tag to the root layout:
${htmlWidgetSnippet}

Option B (Custom Chat UI): Call POST ${PUBLIC_BASE_URL}/api/public/v1/sessions with {"installation_id": "${activeInstId}"} and header "X-Tanat-Publishable-Key: ${activePkValue}", then send user messages to POST ${PUBLIC_BASE_URL}/api/public/v1/sessions/:id/messages.`;

  if (booting) {
    return (
      <div className="dash-boot">
        <div className="spinner" />
        <span>Loading your Tanat workspace…</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="dash-boot">
        <Logo size={34} />
        <h1>We could not open this workspace.</h1>
        <p>{error ?? 'Your session may have expired.'}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="btn btn-primary" href="/login">
            Sign in again
          </Link>
          <Link className="btn" href="/">
            Back to site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/" aria-label="Tanat home">
            <Logo size={26} />
          </Link>
          <span className="topbar-divider" />
          <span className="topbar-tenant">{tenant.name}</span>
          <span className="topbar-key" title="Workspace session">
            {keyHint}
          </span>
        </div>

        <div className="topbar-right">
          <Link className="btn btn-sm" href="/start">
            Guided Setup
          </Link>
          <Link className="btn btn-sm" href="/docs">
            Docs
          </Link>
          <span className="mode-pill">
            <span className="mode-dot" />
            TEE Active
          </span>
          <button className="btn btn-sm" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner" style={{ margin: '10px 22px 0' }}>
          {error}
          <button
            className="btn btn-sm"
            style={{ marginLeft: 12, height: 24 }}
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="success-banner" style={{ margin: '10px 22px 0', padding: '10px 14px' }}>
          {notice}
        </div>
      )}

      {/* Workspace Shell */}
      <div className="ws-shell">
        <aside className="ws-sidebar" aria-label="Workspace navigation">
          <div>
            <div className="ws-nav-group">
              <div className="ws-nav-label">Workspace</div>
              <button
                className={`ws-nav-btn ${section === 'overview' ? 'active' : ''}`}
                onClick={() => setSection('overview')}
              >
                <span>Overview</span>
              </button>
              <button
                className={`ws-nav-btn ${section === 'agents' ? 'active' : ''}`}
                onClick={() => {
                  setSection('agents');
                  setSelectedAgentId(null);
                }}
              >
                <span>Agents</span>
                <span className="badge-count">{agents.length}</span>
              </button>
              <button
                className={`ws-nav-btn ${section === 'knowledge' ? 'active' : ''}`}
                onClick={() => setSection('knowledge')}
              >
                <span>Knowledge & Memory</span>
                <span className="badge-count">{knowledge.length}</span>
              </button>
              <button
                className={`ws-nav-btn ${section === 'channels' ? 'active' : ''}`}
                onClick={() => setSection('channels')}
              >
                <span>Channels & Widget</span>
              </button>
              <button
                className={`ws-nav-btn ${section === 'integrations' ? 'active' : ''}`}
                onClick={() => setSection('integrations')}
              >
                <span>Integrations</span>
              </button>
            </div>

            <div className="ws-nav-group" style={{ marginTop: 10 }}>
              <div className="ws-nav-label">Operations</div>
              <button
                className={`ws-nav-btn ${section === 'conversations' ? 'active' : ''}`}
                onClick={() => setSection('conversations')}
              >
                <span>Conversations</span>
              </button>
              <button
                className={`ws-nav-btn ${section === 'activity' ? 'active' : ''}`}
                onClick={() => setSection('activity')}
              >
                <span>Approvals & Runs</span>
                {pendingActions > 0 && (
                  <span className="badge-count">{pendingActions}</span>
                )}
              </button>
              <button
                className={`ws-nav-btn ${section === 'analytics' ? 'active' : ''}`}
                onClick={() => setSection('analytics')}
              >
                <span>Analytics</span>
              </button>
            </div>

            <div className="ws-nav-group" style={{ marginTop: 10 }}>
              <div className="ws-nav-label">Platform</div>
              <button
                className={`ws-nav-btn ${section === 'team' ? 'active' : ''}`}
                onClick={() => setSection('team')}
              >
                <span>Team & Members</span>
              </button>
              <button
                className={`ws-nav-btn ${section === 'developers' ? 'active' : ''}`}
                onClick={() => setSection('developers')}
              >
                <span>Developers & MCP</span>
              </button>
              <button
                className={`ws-nav-btn ${section === 'settings' ? 'active' : ''}`}
                onClick={() => setSection('settings')}
              >
                <span>Settings</span>
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,13,11,0.04)',
              fontSize: 11.5,
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {tenant.name}
            </div>
            <div className="mono" style={{ fontSize: 10, marginTop: 2 }}>
              ID: {tenant.id.slice(0, 14)}…
            </div>
          </div>
        </aside>

        <main className="ws-main">
          {/* ── 1. OVERVIEW ──────────────────────────────────────────── */}
          {section === 'overview' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Workspace Overview</h1>
                  <p>
                    Manage your AI agents, business knowledge, channel deployments,
                    and human-in-the-loop governance for{' '}
                    <strong>{tenant.name}</strong>.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSection('agents');
                      setShowNewAgentModal(true);
                    }}
                  >
                    + Create Agent
                  </button>
                  <button
                    className="btn"
                    onClick={() => setSection('channels')}
                  >
                    Install Website Widget
                  </button>
                </div>
              </div>

              <div className="ws-grid-4">
                <div className="stat-card">
                  <div className="stat-label">ACTIVE AGENTS</div>
                  <div className="stat-value">{agents.length}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {installations.length} channel installation(s)
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">CONVERSATIONS</div>
                  <div className="stat-value">{analytics?.total_sessions ?? 0}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {analytics?.total_messages ?? 0} total messages
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">KNOWLEDGE & MEMORY</div>
                  <div className="stat-value">{knowledge.length}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {memories.length} customer facts remembered
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">PENDING APPROVALS</div>
                  <div className="stat-value">{pendingActions}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {runs.length} total agent runs logged
                  </div>
                </div>
              </div>

              <div className="ws-grid-2">
                <div className="ws-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <h3>Your AI Agents</h3>
                    <button
                      className="btn btn-sm"
                      onClick={() => setSection('agents')}
                    >
                      Manage all →
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {agents.map((ag) => (
                      <div
                        key={ag.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                            {ag.name}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {ag.description || 'Business AI Agent'} · v{ag.version}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className="ws-pill published">{ag.status}</span>
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setSelectedAgentId(ag.id);
                              setSection('agents');
                            }}
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ws-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <h3>Quick Actions & Deployment</h3>
                    <span className="ws-pill ready">Ready</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <button
                      className="btn"
                      style={{ justifyContent: 'space-between', width: '100%' }}
                      onClick={() => setSection('knowledge')}
                    >
                      <span>1. Add FAQs, website policies, or SOP documents</span>
                      <span>→</span>
                    </button>
                    <button
                      className="btn"
                      style={{ justifyContent: 'space-between', width: '100%' }}
                      onClick={() => setSection('conversations')}
                    >
                      <span>2. Test your agents in a live conversation</span>
                      <span>→</span>
                    </button>
                    <button
                      className="btn"
                      style={{ justifyContent: 'space-between', width: '100%' }}
                      onClick={() => setSection('channels')}
                    >
                      <span>3. Copy your 1-line Website Widget or preview live</span>
                      <span>→</span>
                    </button>
                    <button
                      className="btn"
                      style={{ justifyContent: 'space-between', width: '100%' }}
                      onClick={() => setSection('developers')}
                    >
                      <span>4. Copy prompt for Cursor, Lovable, Bolt, or v0</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="ws-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <h3>Recent Agent Runs & Telemetry</h3>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setActivityTab('runs');
                      setSection('activity');
                    }}
                  >
                    Full activity log →
                  </button>
                </div>
                {runs.length === 0 ? (
                  <p className="muted">
                    No agent runs recorded yet. Open <strong>Conversations</strong>{' '}
                    or launch the <strong>Website Widget</strong> to run your first
                    turn.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {runs.slice(0, 5).map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '9px 12px',
                          borderRadius: 9,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          fontSize: 12.5,
                        }}
                      >
                        <div>
                          <strong>{r.agent_name ?? r.agent_id}</strong> ·{' '}
                          <span className="mono">{r.channel_type}</span>
                        </div>
                        <div className="mono" style={{ fontSize: 11.5 }}>
                          {r.duration_ms}ms · {r.tokens_used} tokens ·{' '}
                          <span className="ws-pill ready">{r.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 2. AGENTS (LIST + PROGRESSIVE-DISCLOSURE DETAIL) ────── */}
          {section === 'agents' && (
            <div className="ws-page">
              {!selectedAgent ? (
                <>
                  <div className="ws-head">
                    <div>
                      <h1>AI Agents</h1>
                      <p>
                        Create and manage specialized agents for customer support,
                        sales, bookings, HR, finance, and internal operations.
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowNewAgentModal((v) => !v)}
                    >
                      {showNewAgentModal ? 'Close' : '+ Create New Agent'}
                    </button>
                  </div>

                  {showNewAgentModal && (
                    <form
                      className="ws-card"
                      style={{ marginBottom: 22 }}
                      onSubmit={(e) => void handleCreateAgentFromTemplate(e)}
                    >
                      <h3>Create Agent from Blueprint</h3>
                      <p style={{ marginBottom: 14 }}>
                        Start from one of Tanat’s 14 industry-ready blueprints or
                        create a custom agent.
                      </p>
                      <div className="ws-grid-3" style={{ marginBottom: 14 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: 6 }}>
                            AGENT BLUEPRINT
                          </label>
                          <select
                            className="input"
                            style={{ width: '100%' }}
                            value={newAgentTemplateId}
                            onChange={(e) => {
                              setNewAgentTemplateId(e.target.value);
                              const found = templates.find(
                                (t) => t.id === e.target.value,
                              );
                              if (found) {
                                setNewAgentName(found.name);
                                setNewAgentDescription(found.description);
                              }
                            }}
                          >
                            {templates.map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>
                                [{tpl.category.toUpperCase()}] {tpl.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 6 }}>
                            AGENT NAME
                          </label>
                          <input
                            className="input"
                            style={{ width: '100%' }}
                            placeholder="e.g. HR & People Assistant"
                            value={newAgentName}
                            onChange={(e) => setNewAgentName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 6 }}>
                            ROLE SUMMARY
                          </label>
                          <input
                            className="input"
                            style={{ width: '100%' }}
                            placeholder="What this agent handles"
                            value={newAgentDescription}
                            onChange={(e) => setNewAgentDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <button className="btn btn-primary" type="submit">
                        Create & Configure Agent
                      </button>
                    </form>
                  )}

                  <div className="ws-grid-3">
                    {agents.map((ag) => {
                      let cfg: { lifecycle?: string; tone?: string; category?: string } =
                        {};
                      try {
                        cfg = JSON.parse(ag.config || '{}');
                      } catch {
                        cfg = {};
                      }
                      const lifecycle = cfg.lifecycle || 'published';
                      return (
                        <div key={ag.id} className="ws-card">
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <span className={`ws-pill ${lifecycle}`}>
                              {lifecycle}
                            </span>
                            <span className="mono" style={{ fontSize: 11 }}>
                              v{ag.version} · {ag.model}
                            </span>
                          </div>
                          <h3>{ag.name}</h3>
                          <p style={{ marginBottom: 14 }}>
                            {ag.description ||
                              'Configured business agent grounded in workspace knowledge.'}
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: 12,
                              borderTop: '1px solid var(--border)',
                            }}
                          >
                            <span className="mono" style={{ fontSize: 11 }}>
                              Tone: {cfg.tone || 'professional'}
                            </span>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setSelectedAgentId(ag.id);
                                setAgentTab('overview');
                              }}
                            >
                              Open Agent →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Progressive-Disclosure Agent Detail View */}
                  <div className="ws-head">
                    <div>
                      <button
                        className="btn btn-sm"
                        style={{ marginBottom: 10 }}
                        onClick={() => setSelectedAgentId(null)}
                      >
                        ← Back to all agents
                      </button>
                      <h1>{selectedAgent.name}</h1>
                      <p>
                        {selectedAgent.description || 'Business AI Agent'} · Version{' '}
                        {selectedAgent.version} · Model: <code>{selectedAgent.model}</code>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['draft', 'testing', 'published', 'paused'] as const).map(
                        (state) => (
                          <button
                            key={state}
                            className="btn btn-sm"
                            onClick={() =>
                              void handleLifecycleChange(selectedAgent.id, state)
                            }
                          >
                            Set {state}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="ws-subtabs">
                    {(
                      [
                        ['overview', 'Overview'],
                        ['instructions', 'Instructions & Behaviour'],
                        ['knowledge', 'Knowledge'],
                        ['permissions', 'Tools & Permissions'],
                        ['channels', 'Channels & Deployments'],
                        ['memory', 'Memory'],
                        ['testing', 'Interactive Testing'],
                        ['versions', 'Activity & Versions'],
                      ] as Array<[AgentDetailTab, string]>
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        className={`filter-chip ${agentTab === id ? 'active' : ''}`}
                        onClick={() => setAgentTab(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {agentTab === 'overview' && (
                    <div className="ws-grid-2">
                      <div className="ws-card">
                        <h3>Agent Summary</h3>
                        <p style={{ marginBottom: 12 }}>
                          <strong>Name:</strong> {selectedAgent.name}
                          <br />
                          <strong>Slug:</strong> <code>{selectedAgent.slug}</code>
                          <br />
                          <strong>Status:</strong> {selectedAgent.status}
                          <br />
                          <strong>Inference Engine:</strong> NEAR AI Cloud (
                          {selectedAgent.model})
                        </p>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setAgentTab('instructions')}
                        >
                          Edit Instructions & Behaviour →
                        </button>
                      </div>
                      <div className="ws-card">
                        <h3>Connected Knowledge & Channels</h3>
                        <p style={{ marginBottom: 12 }}>
                          This agent automatically accesses{' '}
                          <strong>
                            {
                              knowledge.filter(
                                (k) => !k.agent_id || k.agent_id === selectedAgent.id,
                              ).length
                            }{' '}
                            approved knowledge sources
                          </strong>{' '}
                          and recalls persistent customer memory across sessions.
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => setAgentTab('knowledge')}
                          >
                            Manage Knowledge
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => setAgentTab('testing')}
                          >
                            Test Agent Live
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {agentTab === 'instructions' && (
                    <div className="ws-card">
                      <h3>Instructions, Tone & System Prompt</h3>
                      <p style={{ marginBottom: 14 }}>
                        Every update creates an immutable version snapshot so you can
                        audit or roll back changes anytime.
                      </p>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>
                          ROLE DESCRIPTION
                        </label>
                        <input
                          className="input"
                          style={{ width: '100%' }}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', marginBottom: 6 }}>
                          SYSTEM INSTRUCTIONS & SAFEGUARDS
                        </label>
                        <textarea
                          className="input"
                          rows={10}
                          style={{ width: '100%', height: 'auto', padding: 12 }}
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => void handleSaveAgentInstructions()}
                      >
                        Save & Publish New Version
                      </button>
                    </div>
                  )}

                  {agentTab === 'knowledge' && (
                    <div className="ws-card">
                      <h3>Knowledge Grounding for {selectedAgent.name}</h3>
                      <p style={{ marginBottom: 14 }}>
                        Sources below are injected into {selectedAgent.name}’s context
                        at runtime.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {knowledge
                          .filter((k) => !k.agent_id || k.agent_id === selectedAgent.id)
                          .map((k) => (
                            <div
                              key={k.id}
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <strong>{k.title}</strong>{' '}
                                <span className="ws-pill ready">{k.source_type}</span>
                                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                  {k.content.slice(0, 160)}
                                  {k.content.length > 160 ? '…' : ''}
                                </div>
                              </div>
                              <span className="ws-pill ready">{k.status}</span>
                            </div>
                          ))}
                      </div>
                      <button
                        className="btn btn-sm"
                        style={{ marginTop: 12 }}
                        onClick={() => setSection('knowledge')}
                      >
                        + Add or edit knowledge sources
                      </button>
                    </div>
                  )}

                  {agentTab === 'permissions' && (
                    <div className="ws-grid-2">
                      <div className="ws-card">
                        <h3>Action & Tool Governance</h3>
                        <p>
                          • <strong>Knowledge Search:</strong> Allowed (read-only across
                          approved workspace sources).
                          <br />• <strong>Customer Memory:</strong> Allowed (scoped to
                          tenant & verified customer).
                          <br />• <strong>Financial / High-Risk Proposals:</strong>{' '}
                          Always requires human approval in the Approvals queue; proposer
                          cannot self-approve.
                        </p>
                      </div>
                      <div className="ws-card">
                        <h3>Workspace Spend & Safety Caps</h3>
                        <p>
                          Workspace spending limit:{' '}
                          <strong>{tenant.spending_limit_near} NEAR</strong> (Total
                          spent: {tenant.total_spent_near} NEAR). Every action is
                          protected by an idempotency key and logged to the audit trail.
                        </p>
                      </div>
                    </div>
                  )}

                  {agentTab === 'channels' && (
                    <div className="ws-card">
                      <h3>Deploy {selectedAgent.name}</h3>
                      <p style={{ marginBottom: 12 }}>
                        Use the snippet below to embed this agent on your website, or
                        open the full <strong>Channels & Widget</strong> configurator.
                      </p>
                      <pre className="ws-CodeBox">{htmlWidgetSnippet}</pre>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={launchLiveWidgetPreview}
                        >
                          Launch Live Widget Preview
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => setSection('channels')}
                        >
                          Open Widget Customizer →
                        </button>
                      </div>
                    </div>
                  )}

                  {agentTab === 'memory' && (
                    <div className="ws-card">
                      <h3>Customer Memories Recalled by {selectedAgent.name}</h3>
                      <p style={{ marginBottom: 12 }}>
                        Facts and preferences automatically extracted from conversations
                        or added by your team.
                      </p>
                      {memories.length === 0 ? (
                        <p className="muted">No customer memories stored yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {memories.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 9,
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>
                                <strong>{m.user_id}</strong> · <code>{m.key}</code>:{' '}
                                {m.value}
                              </span>
                              <span className="mono" style={{ fontSize: 11 }}>
                                {m.memory_type}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {agentTab === 'testing' && (
                    <div
                      className="ws-card"
                      style={{ padding: 0, overflow: 'hidden', minHeight: 520 }}
                    >
                      <Chat
                        tenantName={tenant.name}
                        onActionsChanged={() => void loadWorkspace()}
                      />
                    </div>
                  )}

                  {agentTab === 'versions' && (
                    <div className="ws-card">
                      <h3>Immutable Version History</h3>
                      <p style={{ marginBottom: 12 }}>
                        Every configuration change is recorded with a version number.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {agentVersions.map((v) => (
                          <div
                            key={v.id}
                            style={{
                              padding: 12,
                              borderRadius: 10,
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 4,
                              }}
                            >
                              <strong>
                                Version {v.version} — {v.change_summary}
                              </strong>
                              <span className="mono" style={{ fontSize: 11 }}>
                                {v.created_at}
                              </span>
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {v.system_prompt.slice(0, 180)}…
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── 3. KNOWLEDGE & MEMORY ────────────────────────────────── */}
          {section === 'knowledge' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Business Knowledge & Customer Memory</h1>
                  <p>
                    Ground your agents in verified company policies, FAQs, websites,
                    and catalogs, and inspect persistent customer memories across
                    sessions.
                  </p>
                </div>
              </div>

              <div className="ws-grid-2">
                <form className="ws-card" onSubmit={(e) => void handleAddKnowledge(e)}>
                  <h3>Add Knowledge Source</h3>
                  <p style={{ marginBottom: 14 }}>
                    Knowledge sources are immediately indexed and injected into agent
                    system prompts at runtime.
                  </p>
                  <div className="ws-grid-2" style={{ marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        SOURCE TYPE
                      </label>
                      <select
                        className="input"
                        style={{ width: '100%' }}
                        value={knType}
                        onChange={(e) =>
                          setKnType(
                            e.target.value as
                              | 'website'
                              | 'faq'
                              | 'document'
                              | 'pdf'
                              | 'text'
                              | 'catalog'
                              | 'policy',
                          )
                        }
                      >
                        <option value="policy">Policy / SOP</option>
                        <option value="faq">FAQ Collection</option>
                        <option value="website">Website / URL Summary</option>
                        <option value="catalog">Product / Service Catalog</option>
                        <option value="document">Internal Document / Handbook</option>
                        <option value="text">Business Notes</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        AGENT SCOPE
                      </label>
                      <select
                        className="input"
                        style={{ width: '100%' }}
                        value={knAgentId}
                        onChange={(e) => setKnAgentId(e.target.value)}
                      >
                        <option value="">All Workspace Agents (Shared)</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            Only {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>TITLE</label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="e.g. 2026 Return & Refund Policy / Clinical Intake Guide"
                      value={knTitle}
                      onChange={(e) => setKnTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      REFERENCE URL (OPTIONAL)
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="https://yourcompany.com/policies"
                      value={knUrl}
                      onChange={(e) => setKnUrl(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      KNOWLEDGE CONTENT
                    </label>
                    <textarea
                      className="input"
                      rows={5}
                      style={{ width: '100%', height: 'auto', padding: 10 }}
                      placeholder="Paste your policy text, FAQs, pricing tiers, or operational procedures..."
                      value={knContent}
                      onChange={(e) => setKnContent(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Save Knowledge Source
                  </button>
                </form>

                <form className="ws-card" onSubmit={(e) => void handleAddMemory(e)}>
                  <h3>Persistent Customer & Workspace Memory</h3>
                  <p style={{ marginBottom: 14 }}>
                    Tanat automatically extracts customer names, preferences, and
                    context during chat. You can also record verified customer facts
                    directly below.
                  </p>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      CUSTOMER / USER ID
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="e.g. usr_4821 or ada@acme.com"
                      value={memUserId}
                      onChange={(e) => setMemUserId(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      MEMORY KEY
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="e.g. account_tier / preferred_contact"
                      value={memKey}
                      onChange={(e) => setMemKey(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      MEMORY VALUE
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="e.g. Enterprise plan · Net-30 billing approved"
                      value={memValue}
                      onChange={(e) => setMemValue(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Store Customer Memory
                  </button>

                  <div style={{ marginTop: 18 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>
                      STORED MEMORIES ({memories.length})
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        maxHeight: 210,
                        overflowY: 'auto',
                      }}
                    >
                      {memories.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 12,
                          }}
                        >
                          <span>
                            <strong>{m.user_id}</strong> · <code>{m.key}</code> ={' '}
                            {m.value}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            style={{ height: 24, padding: '0 8px' }}
                            onClick={async () => {
                              await deleteMemory(m.id);
                              await loadWorkspace();
                            }}
                          >
                            Forget
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              <div className="ws-card">
                <h3>Active Knowledge Sources ({knowledge.length})</h3>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  {knowledge.map((k) => (
                    <div
                      key={k.id}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <strong>{k.title}</strong>
                          <span className="ws-pill ready">{k.source_type}</span>
                          <span className="ws-pill ready">{k.status}</span>
                        </div>
                        {k.url && (
                          <div className="mono" style={{ fontSize: 11, marginTop: 3 }}>
                            {k.url}
                          </div>
                        )}
                        <p style={{ marginTop: 6 }}>{k.content}</p>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={async () => {
                          await deleteKnowledge(k.id);
                          await loadWorkspace();
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 4. CHANNELS & WEBSITE WIDGET INSTALLER ───────────────── */}
          {section === 'channels' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Channels & Website Widget Installer</h1>
                  <p>
                    Customize your Shadow-DOM website widget, lock publishable keys
                    to your domains, copy your embed snippet, or test the widget
                    live on this page.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={launchLiveWidgetPreview}
                >
                  Launch Live Widget Preview ↗
                </button>
              </div>

              <div className="ws-grid-2">
                <div className="ws-card">
                  <h3>1. Configure Website Widget</h3>
                  <div style={{ marginTop: 12, marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      SELECT AGENT INSTALLATION
                    </label>
                    <select
                      className="input"
                      style={{ width: '100%' }}
                      value={selectedInstId}
                      onChange={(e) => setSelectedInstId(e.target.value)}
                    >
                      {installations.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.agent_name || inst.agent_id} ({inst.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ws-grid-3" style={{ marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        THEME
                      </label>
                      <select
                        className="input"
                        style={{ width: '100%' }}
                        value={widgetTheme}
                        onChange={(e) =>
                          setWidgetTheme(e.target.value as 'light' | 'dark')
                        }
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        ACCENT COLOR
                      </label>
                      <input
                        className="input"
                        style={{ width: '100%' }}
                        value={widgetAccent}
                        onChange={(e) => setWidgetAccent(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        POSITION
                      </label>
                      <select
                        className="input"
                        style={{ width: '100%' }}
                        value={widgetPosition}
                        onChange={(e) =>
                          setWidgetPosition(
                            e.target.value as 'bottom-right' | 'bottom-left',
                          )
                        }
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      WELCOME GREETING
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      value={widgetWelcome}
                      onChange={(e) => setWidgetWelcome(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      ALLOWED DOMAINS (CORS ALLOWLIST)
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="https://yourcompany.com, http://localhost:3000"
                      value={widgetOrigins}
                      onChange={(e) => setWidgetOrigins(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => void handleGeneratePublishableKey()}
                    >
                      Save Config & Issue Publishable Key
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={launchLiveWidgetPreview}
                    >
                      Preview Widget
                    </button>
                  </div>
                </div>

                <div className="ws-card">
                  <h3>2. Copy Embed Code</h3>
                  <p style={{ marginBottom: 10 }}>
                    Paste into any HTML <code>&lt;body&gt;</code>, Shopify theme,
                    WordPress header, Webflow site, or Next.js layout.
                  </p>
                  <pre className="ws-CodeBox">{htmlWidgetSnippet}</pre>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(htmlWidgetSnippet);
                        flash('Copied HTML widget snippet.');
                      }}
                    >
                      Copy HTML Snippet
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(reactWidgetSnippet);
                        flash('Copied React / Next.js snippet.');
                      }}
                    >
                      Copy Next.js Snippet
                    </button>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                      ACTIVE PUBLISHABLE KEYS ({pubKeys.length})
                    </label>
                    {pubKeys.map((pk) => (
                      <div
                        key={pk.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <code>{pk.key_value}</code>
                          <div className="muted" style={{ fontSize: 10.5 }}>
                            Origins: {pk.allowed_origins}
                          </div>
                        </div>
                        {pk.is_active ? (
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ height: 24 }}
                            onClick={async () => {
                              await revokePublishableKey(pk.id);
                              await loadWorkspace();
                            }}
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="ws-pill">Revoked</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ws-card">
                <h3>Configured Agent Channels ({channels.length})</h3>
                <div className="ws-grid-3" style={{ marginTop: 12, marginBottom: 0 }}>
                  {channels.map((ch) => (
                    <div
                      key={ch.id}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <strong>{ch.name}</strong>
                        <span className={`ws-pill ${ch.status}`}>{ch.status}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 11, marginBottom: 10 }}>
                        Channel: {ch.channel_type} · Inst: {ch.installation_id}
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={async () => {
                          const next = ch.status === 'active' ? 'paused' : 'active';
                          await updateChannelStatus(ch.id, { status: next });
                          await loadWorkspace();
                        }}
                      >
                        {ch.status === 'active' ? 'Pause Channel' : 'Activate Channel'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 5. INTEGRATIONS CATALOGUE ────────────────────────────── */}
          {section === 'integrations' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Business Integrations</h1>
                  <p>
                    Connect communication channels, commerce systems, CRMs, and
                    payment settlement rails. Statuses reflect real workspace
                    connections.
                  </p>
                </div>
              </div>

              <div className="ws-grid-3">
                {integrations.map((int) => (
                  <div key={int.type} className="ws-card">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <span className="mono" style={{ fontSize: 10.5 }}>
                        {int.category.toUpperCase()}
                      </span>
                      <span className={`ws-pill ${int.status}`}>
                        {int.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3>{int.name}</h3>
                    <p style={{ marginBottom: 12 }}>{int.description}</p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                        marginBottom: 14,
                      }}
                    >
                      {int.capabilities.map((cap) => (
                        <span key={cap} className="ws-pill" style={{ fontSize: 9.5 }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                    {int.status !== 'coming_soon' && (
                      <button
                        className="btn btn-sm"
                        onClick={async () => {
                          await configureIntegration({
                            integration_type: int.type,
                            name: int.name,
                            status: int.configured ? 'connected' : 'pending',
                            config: { updated_from: 'dashboard' },
                          });
                          await loadWorkspace();
                          flash(`Updated ${int.name} integration status.`);
                        }}
                      >
                        {int.status === 'connected'
                          ? 'Configured ✓'
                          : 'Configure Connection'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. CONVERSATIONS ─────────────────────────────────────── */}
          {section === 'conversations' && (
            <div style={{ height: 'calc(100vh - 98px)' }}>
              <Chat
                tenantName={tenant.name}
                onActionsChanged={() => void loadWorkspace()}
              />
            </div>
          )}

          {/* ── 7. APPROVALS & AGENT RUNS ────────────────────────────── */}
          {section === 'activity' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Governance Approvals & Execution Runs</h1>
                  <p>
                    Review human-in-the-loop action proposals and inspect every
                    agent execution turn, latency, model, and cited knowledge source.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`filter-chip ${
                      activityTab === 'approvals' ? 'active' : ''
                    }`}
                    onClick={() => setActivityTab('approvals')}
                  >
                    Human Approvals ({pendingActions})
                  </button>
                  <button
                    className={`filter-chip ${
                      activityTab === 'runs' ? 'active' : ''
                    }`}
                    onClick={() => setActivityTab('runs')}
                  >
                    Agent Execution Log ({runs.length})
                  </button>
                </div>
              </div>

              {activityTab === 'approvals' ? (
                <ActionsList onActionsChanged={() => void loadWorkspace()} />
              ) : (
                <div className="ws-card">
                  <h3>Agent Execution Log</h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {runs.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div>
                          <strong>{r.agent_name || r.agent_id}</strong> ·{' '}
                          <span className="ws-pill ready">{r.channel_type}</span>{' '}
                          <span className="ws-pill published">{r.privacy_tier}</span>
                          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                            Model: <code>{r.model}</code> · Sources:{' '}
                            <code>{r.knowledge_sources_used}</code> · Tools:{' '}
                            <code>{r.tools_called}</code>
                          </div>
                        </div>
                        <div className="mono" style={{ fontSize: 11.5 }}>
                          {r.duration_ms}ms · {r.tokens_used} tok · {r.created_at}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 8. ANALYTICS ─────────────────────────────────────────── */}
          {section === 'analytics' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Workspace Analytics</h1>
                  <p>
                    Real-time usage and execution telemetry from your workspace
                    database — never fabricated.
                  </p>
                </div>
              </div>

              <div className="ws-grid-4">
                <div className="stat-card">
                  <div className="stat-label">TOTAL SESSIONS</div>
                  <div className="stat-value">{analytics?.total_sessions ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">TOTAL MESSAGES</div>
                  <div className="stat-value">{analytics?.total_messages ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">AVG INFERENCE LATENCY</div>
                  <div className="stat-value">
                    {analytics?.avg_duration_ms ?? 0}ms
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">TOTAL TOKENS</div>
                  <div className="stat-value">{analytics?.total_tokens ?? 0}</div>
                </div>
              </div>

              <div className="ws-grid-2">
                <div className="ws-card">
                  <h3>Conversations by Agent</h3>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(analytics?.sessions_by_agent ?? []).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: 'var(--bg)',
                        }}
                      >
                        <strong>{item.name}</strong>
                        <span className="mono">{item.session_count} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ws-card">
                  <h3>Runs by Channel & Actions by Status</h3>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(analytics?.runs_by_channel ?? []).map((ch) => (
                      <div
                        key={ch.channel_type}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: 'var(--bg)',
                        }}
                      >
                        <span>Channel: {ch.channel_type}</span>
                        <span className="mono">{ch.count} runs</span>
                      </div>
                    ))}
                    {(analytics?.actions_by_status ?? []).map((act) => (
                      <div
                        key={act.status}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: 'var(--bg)',
                        }}
                      >
                        <span>Actions ({act.status})</span>
                        <span className="mono">{act.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 9. TEAM & MEMBERS ────────────────────────────────────── */}
          {section === 'team' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Team & Governance Roles</h1>
                  <p>
                    Manage who can configure agents, approve proposed actions, or
                    view workspace analytics.
                  </p>
                </div>
              </div>

              <div className="ws-grid-2">
                <form
                  className="ws-card"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await inviteMember({
                        email: inviteEmail.trim(),
                        name: inviteName.trim(),
                        role: inviteRole,
                      });
                      setInviteEmail('');
                      setInviteName('');
                      await loadWorkspace();
                      flash('Invited team member.');
                    } catch (err) {
                      setError(
                        err instanceof ApiError ? err.message : 'Invite failed.',
                      );
                    }
                  }}
                >
                  <h3>Invite Workspace Member</h3>
                  <div style={{ marginTop: 12, marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>NAME</label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="Alex Rivera"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      WORK EMAIL
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      type="email"
                      placeholder="alex@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>ROLE</label>
                    <select
                      className="input"
                      style={{ width: '100%' }}
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(
                          e.target.value as 'admin' | 'operator' | 'viewer',
                        )
                      }
                    >
                      <option value="admin">Admin — Manage agents, keys & approvals</option>
                      <option value="operator">
                        Operator — Review conversations & approve actions
                      </option>
                      <option value="viewer">Viewer — Read-only access</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Send Invite
                  </button>
                </form>

                <div className="ws-card">
                  <h3>Workspace Members ({members.length})</h3>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {members.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong>{m.name}</strong> ({m.email})
                          <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                            Role: {m.role.toUpperCase()} · {m.status}
                          </div>
                        </div>
                        {m.role !== 'owner' && m.status !== 'revoked' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={async () => {
                              await removeMember(m.id);
                              await loadWorkspace();
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 10. DEVELOPERS & VIBECODERS ──────────────────────────── */}
          {section === 'developers' && (
            <div className="ws-page">
              <div className="ws-head">
                <div>
                  <h1>Developers, Vibecoding & MCP</h1>
                  <p>
                    Integrate Tanat via one-click AI coding prompts (Cursor, Lovable,
                    Bolt, v0), HMAC verified-user signatures, REST APIs, and Model
                    Context Protocol discovery.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    className="btn btn-sm"
                    href="/llms.txt"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open /llms.txt ↗
                  </a>
                  <a
                    className="btn btn-sm"
                    href={`${PUBLIC_BASE_URL}/api/mcp`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open /api/mcp ↗
                  </a>
                </div>
              </div>

              <div className="ws-grid-2">
                <div className="ws-card">
                  <h3>Copy Prompt for Cursor / Lovable / Bolt / v0</h3>
                  <p style={{ marginBottom: 10 }}>
                    Pre-filled with your workspace’s live publishable key and agent
                    installation ID. Paste directly into your AI coding assistant.
                  </p>
                  <pre className="ws-CodeBox">{vibecoderPrompt}</pre>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 10 }}
                    onClick={async () => {
                      await navigator.clipboard.writeText(vibecoderPrompt);
                      flash('Copied Vibecoder integration prompt to clipboard.');
                    }}
                  >
                    Copy Vibecoder Prompt
                  </button>
                </div>

                <div className="ws-card">
                  <h3>Verified Customer Identity (HMAC Token Generator)</h3>
                  <p style={{ marginBottom: 12 }}>
                    Sign your logged-in customer’s ID with HMAC-SHA256 so your agent
                    recognizes who it is speaking to and recalls their persistent
                    memories safely.
                  </p>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      CUSTOMER USER ID
                    </label>
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      value={verifyUserId}
                      onChange={(e) => setVerifyUserId(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={async () => {
                      try {
                        const res = await createVerifiedUserToken({
                          installation_id: activeInstId,
                          user_id: verifyUserId.trim(),
                        });
                        setVerifiedTokenResult(res);
                      } catch (err) {
                        setError(
                          err instanceof ApiError
                            ? err.message
                            : 'Failed to sign user ID.',
                        );
                      }
                    }}
                  >
                    Generate HMAC Signature
                  </button>

                  {verifiedTokenResult && (
                    <pre className="ws-CodeBox" style={{ marginTop: 12 }}>
                      {`data-user-id="${verifiedTokenResult.user_id}"\ndata-user-signature="${verifiedTokenResult.user_signature}"`}
                    </pre>
                  )}
                </div>
              </div>

              <Settings />
            </div>
          )}

          {/* ── 11. SETTINGS ─────────────────────────────────────────── */}
          {section === 'settings' && <Settings />}
        </main>
      </div>

      <footer className="statusbar">
        <span className="status-dot" />
        <span>
          Workspace: <strong>{tenant.name}</strong>
        </span>
        <span className="status-sep">|</span>
        <span className="near-badge">NEAR AI Cloud · TEE Attested Inference</span>
        <span className="status-sep">|</span>
        <span className="mono">{API_URL}</span>
      </footer>
    </div>
  );
}
