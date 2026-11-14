'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { extractTextFromFile } from '@/lib/file-extractor';
import { FormattedPreview } from '@/components/FormattedPreview';
import { PrivacyCentre } from '@/components/PrivacyCentre';
import {
  ApiError,
  API_URL,
  configureIntegration,
  createAgent,
  createInstallation,
  createKnowledge,
  createMemory,
  createPublishableKey,
  createChannel,
  setupTelegramChannel,
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
import {
  CursorLogo,
  FramerLogo,
  LovableLogo,
  NearLogo,
  NextJsLogo,
  ShopifyLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WebflowLogo,
  WhatsAppLogo,
  WidgetLogo,
  WordPressLogo,
} from '@/components/brand/PlatformLogos';
import '../landing.css';
import Chat from '@/components/Chat';
import ActionsList from '@/components/ActionsList';
import Settings from '@/components/Settings';

function getBrandIcon(typeOrName: string, size = 18) {
  const k = typeOrName.toLowerCase();
  if (k.includes('telegram')) return <TelegramLogo size={size} />;
  if (k.includes('whatsapp')) return <WhatsAppLogo size={size} />;
  if (k.includes('slack')) return <SlackLogo size={size} />;
  if (k.includes('shopify')) return <ShopifyLogo size={size} />;
  if (k.includes('wordpress')) return <WordPressLogo size={size} />;
  if (k.includes('webflow')) return <WebflowLogo size={size} />;
  if (k.includes('framer')) return <FramerLogo size={size} />;
  if (k.includes('next')) return <NextJsLogo size={size} />;
  if (k.includes('lovable')) return <LovableLogo size={size} />;
  if (k.includes('cursor')) return <CursorLogo size={size} />;
  if (k.includes('near')) return <NearLogo size={size} />;
  return <WidgetLogo size={size} />;
}

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
  | 'privacy'
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
    'website' | 'faq' | 'document' | 'pdf' | 'text' | 'catalog' | 'policy' | 'other'
  >('policy');
  const [knCustomType, setKnCustomType] = useState('');
  const [knTitle, setKnTitle] = useState('');
  const [knUrl, setKnUrl] = useState('');
  const [knContent, setKnContent] = useState('');
  const [knAgentId, setKnAgentId] = useState<string>('');
  const [knUploading, setKnUploading] = useState(false);
  const [knUploadSuccess, setKnUploadSuccess] = useState<string | null>(null);
  const [knDragOver, setKnDragOver] = useState(false);
  const [knEditorTab, setKnEditorTab] = useState<'edit' | 'preview'>('edit');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const knTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const knFileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [widgetOrigins, setWidgetOrigins] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : 'https://tanat.space',
  );

  // Messaging Channel form state
  const [activeChannelTab, setActiveChannelTab] = useState<'website' | 'telegram' | 'whatsapp' | 'slack'>('website');
  const [tgBotToken, setTgBotToken] = useState('');
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waVerifyToken, setWaVerifyToken] = useState('tanat_wa_verify_' + Math.random().toString(36).substring(2, 10));
  const [waAppSecret, setWaAppSecret] = useState('');
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackSigningSecret, setSlackSigningSecret] = useState('');
  const [isSavingSlack, setIsSavingSlack] = useState(false);

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

  useEffect(() => {
    if (knTextareaRef.current && knEditorTab === 'edit') {
      knTextareaRef.current.style.height = 'auto';
      knTextareaRef.current.style.height = `${Math.max(150, knTextareaRef.current.scrollHeight)}px`;
    }
  }, [knContent, knEditorTab, section]);

  // Restore active section and Knowledge form draft on page refresh
  useEffect(() => {
    try {
      const savedSection = localStorage.getItem('tanat_dashboard_section');
      if (
        savedSection &&
        [
          'overview',
          'agents',
          'knowledge',
          'channels',
          'integrations',
          'conversations',
          'activity',
          'analytics',
          'team',
          'developers',
          'settings',
        ].includes(savedSection)
      ) {
        setSection(savedSection as Section);
      }

      const rawDraft = localStorage.getItem('tanat_knowledge_draft_v1');
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Partial<{
          knType: 'website' | 'faq' | 'document' | 'pdf' | 'text' | 'catalog' | 'policy' | 'other';
          knCustomType: string;
          knAgentId: string;
          knTitle: string;
          knUrl: string;
          knContent: string;
          knEditorTab: 'edit' | 'preview';
        }>;
        if (draft.knType) setKnType(draft.knType);
        if (typeof draft.knCustomType === 'string') setKnCustomType(draft.knCustomType);
        if (typeof draft.knAgentId === 'string') setKnAgentId(draft.knAgentId);
        if (typeof draft.knTitle === 'string') setKnTitle(draft.knTitle);
        if (typeof draft.knUrl === 'string') setKnUrl(draft.knUrl);
        if (typeof draft.knContent === 'string') setKnContent(draft.knContent);
        if (draft.knEditorTab === 'edit' || draft.knEditorTab === 'preview') {
          setKnEditorTab(draft.knEditorTab);
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  // Persist active section & Knowledge form draft across refreshes
  useEffect(() => {
    if (!draftHydrated) return;
    try {
      localStorage.setItem('tanat_dashboard_section', section);
    } catch {
      // Ignore storage errors
    }
  }, [draftHydrated, section]);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      const hasDraft =
        knTitle ||
        knUrl ||
        knContent ||
        knCustomType ||
        knAgentId ||
        knType !== 'policy';
      if (hasDraft) {
        localStorage.setItem(
          'tanat_knowledge_draft_v1',
          JSON.stringify({
            knType,
            knCustomType,
            knAgentId,
            knTitle,
            knUrl,
            knContent,
            knEditorTab,
          }),
        );
      } else {
        localStorage.removeItem('tanat_knowledge_draft_v1');
      }
    } catch {
      // Ignore quota / storage errors
    }
  }, [draftHydrated, knType, knCustomType, knAgentId, knTitle, knUrl, knContent, knEditorTab]);

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

  async function handleKnowledgeFileUpload(file: File) {
    setKnUploading(true);
    setKnUploadSuccess(null);
    setError(null);
    try {
      const doc = await extractTextFromFile(file);
      setKnContent((prev) => (prev.trim() ? `${prev.trim()}\n\n${doc.text}` : doc.text));
      if (!knTitle.trim()) {
        setKnTitle(doc.suggestedTitle);
      }
      if (knType !== 'other') {
        setKnType(doc.suggestedType);
      }
      setKnEditorTab('edit');
      const kbSize = (doc.fileSize / 1024).toFixed(1);
      setKnUploadSuccess(
        `Extracted ${doc.wordCount.toLocaleString()} words from "${doc.fileName}" (${kbSize} KB).`,
      );
      flash(`Extracted ${doc.wordCount.toLocaleString()} words from ${doc.fileName}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to extract text from the uploaded file.',
      );
    } finally {
      setKnUploading(false);
      if (knFileInputRef.current) {
        knFileInputRef.current.value = '';
      }
    }
  }

  function applyKnowledgeFormat(
    format:
      | 'bold'
      | 'italic'
      | 'underline'
      | 'strike'
      | 'h2'
      | 'h3'
      | 'bullet'
      | 'number'
      | 'quote'
      | 'code'
      | 'clear',
  ) {
    const textarea = knTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.slice(start, end);

    let replacement = '';
    let cursorStartOffset = 0;
    let cursorEndOffset = 0;

    switch (format) {
      case 'bold': {
        const inner = selected || 'bold text';
        replacement = `**${inner}**`;
        cursorStartOffset = selected ? replacement.length : 2;
        cursorEndOffset = selected ? replacement.length : 2 + inner.length;
        break;
      }
      case 'italic': {
        const inner = selected || 'italic text';
        replacement = `*${inner}*`;
        cursorStartOffset = selected ? replacement.length : 1;
        cursorEndOffset = selected ? replacement.length : 1 + inner.length;
        break;
      }
      case 'underline': {
        const inner = selected || 'underlined text';
        replacement = `<u>${inner}</u>`;
        cursorStartOffset = selected ? replacement.length : 3;
        cursorEndOffset = selected ? replacement.length : 3 + inner.length;
        break;
      }
      case 'strike': {
        const inner = selected || 'strikethrough text';
        replacement = `~~${inner}~~`;
        cursorStartOffset = selected ? replacement.length : 2;
        cursorEndOffset = selected ? replacement.length : 2 + inner.length;
        break;
      }
      case 'h2': {
        const prefix = start > 0 && current[start - 1] !== '\n' ? '\n## ' : '## ';
        const inner = selected || 'Section Heading';
        replacement = `${prefix}${inner}`;
        cursorStartOffset = selected ? replacement.length : prefix.length;
        cursorEndOffset = replacement.length;
        break;
      }
      case 'h3': {
        const prefix = start > 0 && current[start - 1] !== '\n' ? '\n### ' : '### ';
        const inner = selected || 'Subheading';
        replacement = `${prefix}${inner}`;
        cursorStartOffset = selected ? replacement.length : prefix.length;
        cursorEndOffset = replacement.length;
        break;
      }
      case 'bullet': {
        if (selected.includes('\n')) {
          replacement = selected
            .split('\n')
            .map((line) => (line.trim() ? `- ${line.replace(/^[-*•]\s+/, '')}` : line))
            .join('\n');
          cursorStartOffset = replacement.length;
          cursorEndOffset = replacement.length;
        } else {
          const prefix = start > 0 && current[start - 1] !== '\n' ? '\n- ' : '- ';
          const inner = selected || 'List item';
          replacement = `${prefix}${inner}`;
          cursorStartOffset = selected ? replacement.length : prefix.length;
          cursorEndOffset = replacement.length;
        }
        break;
      }
      case 'number': {
        if (selected.includes('\n')) {
          let index = 1;
          replacement = selected
            .split('\n')
            .map((line) => (line.trim() ? `${index++}. ${line.replace(/^\d+\.\s+/, '')}` : line))
            .join('\n');
          cursorStartOffset = replacement.length;
          cursorEndOffset = replacement.length;
        } else {
          const prefix = start > 0 && current[start - 1] !== '\n' ? '\n1. ' : '1. ';
          const inner = selected || 'Numbered item';
          replacement = `${prefix}${inner}`;
          cursorStartOffset = selected ? replacement.length : prefix.length;
          cursorEndOffset = replacement.length;
        }
        break;
      }
      case 'quote': {
        if (selected.includes('\n')) {
          replacement = selected
            .split('\n')
            .map((line) => (line.trim() ? `> ${line}` : line))
            .join('\n');
          cursorStartOffset = replacement.length;
          cursorEndOffset = replacement.length;
        } else {
          const prefix = start > 0 && current[start - 1] !== '\n' ? '\n> ' : '> ';
          const inner = selected || 'Key policy note';
          replacement = `${prefix}${inner}`;
          cursorStartOffset = selected ? replacement.length : prefix.length;
          cursorEndOffset = replacement.length;
        }
        break;
      }
      case 'code': {
        const inner = selected || 'code';
        replacement = selected.includes('\n') ? `\`\`\`\n${inner}\n\`\`\`` : `\`${inner}\``;
        cursorStartOffset = selected ? replacement.length : 1;
        cursorEndOffset = selected ? replacement.length : 1 + inner.length;
        break;
      }
      case 'clear': {
        replacement = selected
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/<u>(.*?)<\/u>/g, '$1')
          .replace(/~~(.*?)~~/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/^(#{1,3}|>|-|\*|\d+\.)\s+/gm, '');
        cursorStartOffset = 0;
        cursorEndOffset = replacement.length;
        break;
      }
    }

    const updated = current.slice(0, start) + replacement + current.slice(end);
    setKnContent(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorStartOffset, start + cursorEndOffset);
    }, 10);
  }

  async function handleAddKnowledge(e: React.FormEvent) {
    e.preventDefault();
    if (!knTitle.trim() || !knContent.trim()) return;
    if (knType === 'other' && !knCustomType.trim()) {
      setError('Please enter a custom source type.');
      return;
    }

    const effectiveType = knType === 'other' ? knCustomType.trim() : knType;

    try {
      await createKnowledge({
        agent_id: knAgentId || null,
        source_type: effectiveType,
        title: knTitle.trim(),
        url: knUrl.trim() || undefined,
        content: knContent.trim(),
        metadata: knType === 'other' ? { custom_source_type: effectiveType } : undefined,
      });
      setKnTitle('');
      setKnUrl('');
      setKnContent('');
      setKnCustomType('');
      setKnType('policy');
      setKnUploadSuccess(null);
      setKnEditorTab('edit');
      try {
        localStorage.removeItem('tanat_knowledge_draft_v1');
      } catch {
        // Ignore storage errors
      }
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
        allowed_origins: origins.length
          ? origins
          : [typeof window !== 'undefined' ? window.location.origin : 'https://tanat.space'],
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

  async function handleConnectTelegram() {
    const instId = selectedInstId || installations[0]?.id;
    if (!instId) {
      setError('Please select an agent installation first.');
      return;
    }
    const token = tgBotToken.trim();
    if (!token) {
      setError('Please paste your Telegram Bot Token from @BotFather.');
      return;
    }

    setIsSavingTg(true);
    try {
      let ch = channels.find((c) => (c.channel || c.channel_type) === 'telegram');
      if (!ch) {
        ch = await createChannel({
          installation_id: instId,
          channel: 'telegram',
          config: { bot_token: token },
          status: 'pending',
        });
      } else {
        await updateChannelStatus(ch.id, {
          config: { bot_token: token },
        });
      }

      const setupRes = await setupTelegramChannel(ch.id);
      await loadWorkspace();
      flash(`Telegram Bot connected! Webhook active: ${setupRes.webhook_url}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to connect Telegram Bot. Check your Bot Token.');
    } finally {
      setIsSavingTg(false);
    }
  }

  async function handleConnectWhatsApp() {
    const instId = selectedInstId || installations[0]?.id;
    if (!instId) {
      setError('Please select an agent installation first.');
      return;
    }
    const phoneId = waPhoneId.trim();
    const token = waAccessToken.trim();
    const verify = waVerifyToken.trim();
    const appSecret = waAppSecret.trim();

    if (!phoneId) {
      setError('Please provide your WhatsApp Phone Number ID from Meta Developer console.');
      return;
    }

    setIsSavingWa(true);
    try {
      let ch = channels.find((c) => (c.channel || c.channel_type) === 'whatsapp');
      const config = {
        phone_number_id: phoneId,
        access_token: token || undefined,
        verify_token: verify,
        app_secret: appSecret || undefined,
      };

      if (!ch) {
        await createChannel({
          installation_id: instId,
          channel: 'whatsapp',
          config,
          status: 'connected',
        });
      } else {
        await updateChannelStatus(ch.id, {
          status: 'connected',
          config,
        });
      }
      await loadWorkspace();
      flash('WhatsApp Cloud API channel configured and activated!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to configure WhatsApp channel.');
    } finally {
      setIsSavingWa(false);
    }
  }

  async function handleConnectSlack() {
    const instId = selectedInstId || installations[0]?.id;
    if (!instId) {
      setError('Please select an agent installation first.');
      return;
    }
    const botToken = slackBotToken.trim();
    const signingSecret = slackSigningSecret.trim();

    if (!botToken && !signingSecret) {
      setError('Please provide your Slack Bot User OAuth Token (xoxb-...) or Signing Secret.');
      return;
    }

    setIsSavingSlack(true);
    try {
      let ch = channels.find((c) => (c.channel || c.channel_type) === 'slack');
      const config = {
        bot_token: botToken || undefined,
        signing_secret: signingSecret || undefined,
      };

      if (!ch) {
        await createChannel({
          installation_id: instId,
          channel: 'slack',
          config,
          status: 'connected',
        });
      } else {
        await updateChannelStatus(ch.id, {
          status: 'connected',
          config,
        });
      }
      await loadWorkspace();
      flash('Slack Workspace channel configured and activated!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to configure Slack channel.');
    } finally {
      setIsSavingSlack(false);
    }
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
  src="https://www.tanat.space/embed/tanat-widget.js"
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
      src="https://www.tanat.space/embed/tanat-widget.js"
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

Option B (Custom Chat UI): Call POST ${PUBLIC_BASE_URL}/api/public/v1/sessions with {"installation_id": "${activeInstId}"} and header "X-Tanat-Key: ${activePkValue}", then send user messages to POST ${PUBLIC_BASE_URL}/api/public/v1/sessions/:id/messages.`;

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
        <TanatMascotIcon size={40} />
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
    <div className="app tn-site">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/" className="tn-brand" aria-label="Tanat home">
            <TanatMascotIcon size={28} />
            <span>Tanat</span>
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
                className={`ws-nav-btn ${section === 'privacy' ? 'active' : ''}`}
                onClick={() => setSection('privacy')}
              >
                <span>Privacy & Security</span>
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
                                <strong>{k.title || k.label}</strong>{' '}
                                <span className="ws-pill ready">{k.source_type || k.kind}</span>
                                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                  {(k.content || '').slice(0, 160)}
                                  {(k.content || '').length > 160 ? '…' : ''}
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
                              | 'policy'
                              | 'other',
                          )
                        }
                      >
                        <option value="policy">Policy / SOP</option>
                        <option value="faq">FAQ Collection</option>
                        <option value="website">Website / URL Summary</option>
                        <option value="catalog">Product / Service Catalog</option>
                        <option value="document">Internal Document / Handbook</option>
                        <option value="text">Business Notes</option>
                        <option value="pdf">PDF Manual / Whitepaper</option>
                        <option value="other">Other (Custom Source Type)...</option>
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
                  {knType === 'other' && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        CUSTOM SOURCE TYPE
                      </label>
                      <input
                        className="input"
                        style={{ width: '100%' }}
                        placeholder="e.g. Employee Handbook, Clinical Protocol, Pricing Matrix, SLA"
                        value={knCustomType}
                        onChange={(e) => setKnCustomType(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                      UPLOAD DOCUMENT (OPTIONAL)
                    </label>
                    <input
                      ref={knFileInputRef}
                      type="file"
                      accept=".txt,.text,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.docx,.doc,.pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleKnowledgeFileUpload(file);
                      }}
                    />
                    <div
                      className={`kn-dropzone ${knDragOver ? 'dragging' : ''}`}
                      onClick={() => knFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setKnDragOver(true);
                      }}
                      onDragLeave={() => setKnDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setKnDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) void handleKnowledgeFileUpload(file);
                      }}
                    >
                      {knUploading ? (
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          Extracting text from document...
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                            Click to browse or drag & drop a file
                          </div>
                          <div
                            className="muted"
                            style={{
                              fontSize: 11.5,
                              display: 'flex',
                              justifyContent: 'center',
                              flexWrap: 'wrap',
                              gap: 6,
                              alignItems: 'center',
                            }}
                          >
                            <span>Supported:</span>
                            {['TXT', 'DOCX', 'CSV', 'PDF', 'MD', 'JSON'].map((ext) => (
                              <span
                                key={ext}
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                }}
                              >
                                {ext}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {knUploadSuccess && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          color: 'var(--success, #22c55e)',
                          fontSize: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span>✓ {knUploadSuccess}</span>
                        <button
                          type="button"
                          className="kn-tool-btn"
                          style={{ color: 'inherit', fontSize: 11 }}
                          onClick={() => setKnUploadSuccess(null)}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
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
                    <div className="kn-toolbar">
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Bold (**text**)"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('bold'), 0);
                        }}
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Italic (*text*)"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('italic'), 0);
                        }}
                      >
                        <em>I</em>
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Underline (<u>text</u>)"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('underline'), 0);
                        }}
                      >
                        <u>U</u>
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Strikethrough (~~text~~)"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('strike'), 0);
                        }}
                      >
                        <s>S</s>
                      </button>
                      <span
                        style={{
                          width: 1,
                          height: 16,
                          background: 'var(--border)',
                          margin: '0 3px',
                        }}
                      />
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Heading 2 (## )"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('h2'), 0);
                        }}
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Heading 3 (### )"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('h3'), 0);
                        }}
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Bullet List (- )"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('bullet'), 0);
                        }}
                      >
                        • List
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Numbered List (1. )"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('number'), 0);
                        }}
                      >
                        1. List
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Quote (> )"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('quote'), 0);
                        }}
                      >
                        ❝ Quote
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Code (`code`)"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('code'), 0);
                        }}
                      >
                        &lt;/&gt; Code
                      </button>
                      <button
                        type="button"
                        className="kn-tool-btn"
                        title="Clear Formatting"
                        onClick={() => {
                          if (knEditorTab !== 'edit') setKnEditorTab('edit');
                          setTimeout(() => applyKnowledgeFormat('clear'), 0);
                        }}
                      >
                        Clear
                      </button>
                      <div
                        style={{
                          marginLeft: 'auto',
                          display: 'flex',
                          gap: 2,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: 2,
                        }}
                      >
                        <button
                          type="button"
                          className={`kn-tab-pill ${knEditorTab === 'edit' ? 'active' : ''}`}
                          onClick={() => setKnEditorTab('edit')}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`kn-tab-pill ${knEditorTab === 'preview' ? 'active' : ''}`}
                          onClick={() => setKnEditorTab('preview')}
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                    {knEditorTab === 'edit' ? (
                      <textarea
                        ref={knTextareaRef}
                        className="input"
                        rows={6}
                        style={{
                          width: '100%',
                          minHeight: 150,
                          resize: 'vertical',
                          borderTopLeftRadius: 0,
                          borderTopRightRadius: 0,
                          padding: 12,
                          lineHeight: 1.55,
                          overflowY: 'hidden',
                        }}
                        placeholder="Paste your policy text, FAQs, pricing tiers, or operational procedures — or upload a document above..."
                        value={knContent}
                        onChange={(e) => {
                          setKnContent(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.max(150, e.target.scrollHeight)}px`;
                        }}
                        required
                      />
                    ) : (
                      <div className="kn-preview-box">
                        <FormattedPreview content={knContent} />
                      </div>
                    )}
                    <div
                      className="muted"
                      style={{
                        fontSize: 11.5,
                        marginTop: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Supports bold, italic, underline, headings, lists & code.</span>
                      <span className="mono">
                        {knContent.split(/\s+/).filter(Boolean).length.toLocaleString()} words ·{' '}
                        {knContent.length.toLocaleString()} chars · ~
                        {Math.ceil(knContent.length / 4).toLocaleString()} tokens
                      </span>
                    </div>
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong>{k.title || k.label}</strong>
                          <span className="ws-pill ready">{k.source_type || k.kind}</span>
                          <span className="ws-pill ready">{k.status}</span>
                        </div>
                        {(k.url || k.uri) && (
                          <div className="mono" style={{ fontSize: 11, marginTop: 3 }}>
                            {k.url || k.uri}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: 8,
                            maxHeight: 220,
                            overflowY: 'auto',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '8px 12px',
                          }}
                        >
                          <FormattedPreview content={k.content || ''} />
                        </div>
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

          {/* ── 4. CHANNELS & INTEGRATIONS ───────────────────────────── */}
          {section === 'channels' && (() => {
            const tgChannel = channels.find((c) => (c.channel || c.channel_type) === 'telegram');
            const waChannel = channels.find((c) => (c.channel || c.channel_type) === 'whatsapp');
            const slackChannel = channels.find((c) => (c.channel || c.channel_type) === 'slack');
            const tgConfig = (() => {
              try {
                return typeof tgChannel?.config === 'string' ? JSON.parse(tgChannel.config) : tgChannel?.config || {};
              } catch {
                return {};
              }
            })();
            const botUsername = (tgConfig as any)?.bot_username || '';

            return (
              <div className="ws-page">
                <div className="ws-head">
                  <div>
                    <h1>Channels & Messaging Deployments</h1>
                    <p>
                      Deploy your AI agent across website, messaging platforms, and internal workspaces.
                      All channels are connected to the same central knowledge base, memory, and governance rules.
                    </p>
                  </div>
                  {activeChannelTab === 'website' && (
                    <button
                      className="btn btn-primary"
                      onClick={launchLiveWidgetPreview}
                    >
                      Launch Live Widget Preview ↗
                    </button>
                  )}
                </div>

                {/* Sub-navigation tabs */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  <button
                    className={`btn ${activeChannelTab === 'website' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveChannelTab('website')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <WidgetLogo size={16} />
                    <span>Website Chat Widget</span>
                    <span className="ws-pill connected" style={{ fontSize: 10 }}>Live</span>
                  </button>
                  <button
                    className={`btn ${activeChannelTab === 'telegram' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveChannelTab('telegram')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <TelegramLogo size={16} />
                    <span>Telegram Bot</span>
                    {tgChannel?.status === 'connected' ? (
                      <span className="ws-pill connected" style={{ fontSize: 10 }}>Connected</span>
                    ) : (
                      <span className="ws-pill" style={{ fontSize: 10 }}>Setup</span>
                    )}
                  </button>
                  <button
                    className={`btn ${activeChannelTab === 'whatsapp' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveChannelTab('whatsapp')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <WhatsAppLogo size={16} />
                    <span>WhatsApp Business</span>
                    {waChannel?.status === 'connected' ? (
                      <span className="ws-pill connected" style={{ fontSize: 10 }}>Connected</span>
                    ) : (
                      <span className="ws-pill" style={{ fontSize: 10 }}>Setup</span>
                    )}
                  </button>
                  <button
                    className={`btn ${activeChannelTab === 'slack' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveChannelTab('slack')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <SlackLogo size={16} />
                    <span>Slack Workspace</span>
                    {slackChannel?.status === 'connected' ? (
                      <span className="ws-pill connected" style={{ fontSize: 10 }}>Connected</span>
                    ) : (
                      <span className="ws-pill" style={{ fontSize: 10 }}>Setup</span>
                    )}
                  </button>
                </div>

                {/* TAB 1: WEBSITE WIDGET */}
                {activeChannelTab === 'website' && (
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
                          <label style={{ display: 'block', marginBottom: 5 }}>THEME</label>
                          <select
                            className="input"
                            style={{ width: '100%' }}
                            value={widgetTheme}
                            onChange={(e) => setWidgetTheme(e.target.value as 'light' | 'dark')}
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 5 }}>ACCENT COLOR</label>
                          <input
                            className="input"
                            style={{ width: '100%' }}
                            value={widgetAccent}
                            onChange={(e) => setWidgetAccent(e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 5 }}>POSITION</label>
                          <select
                            className="input"
                            style={{ width: '100%' }}
                            value={widgetPosition}
                            onChange={(e) => setWidgetPosition(e.target.value as 'bottom-right' | 'bottom-left')}
                          >
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-left">Bottom Left</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>WELCOME GREETING</label>
                        <input
                          className="input"
                          style={{ width: '100%' }}
                          value={widgetWelcome}
                          onChange={(e) => setWidgetWelcome(e.target.value)}
                        />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>ALLOWED DOMAINS (CORS ALLOWLIST)</label>
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
                        Paste into any HTML <code>&lt;body&gt;</code>, Shopify theme, WordPress header, Webflow site, or Next.js layout.
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
                )}

                {/* TAB 2: TELEGRAM BOT */}
                {activeChannelTab === 'telegram' && (
                  <div className="ws-grid-2">
                    <div className="ws-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3>Connect Telegram Bot</h3>
                        <span className={`ws-pill ${tgChannel?.status === 'connected' ? 'connected' : 'pending'}`}>
                          {tgChannel?.status === 'connected' ? 'Active & Live' : 'Not Connected'}
                        </span>
                      </div>
                      <p style={{ marginBottom: 14 }}>
                        Give your customers instant 24/7 AI support directly in Telegram. We register the webhook automatically with Telegram servers.
                      </p>

                      <div style={{ marginBottom: 12 }}>
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

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>
                          TELEGRAM BOT TOKEN (FROM @BotFather)
                        </label>
                        <input
                          className="input"
                          style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                          placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_0123456"
                          value={tgBotToken}
                          onChange={(e) => setTgBotToken(e.target.value)}
                        />
                        <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          Your bot token is encrypted at rest and used only to communicate with Telegram Bot API.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={isSavingTg}
                          onClick={() => void handleConnectTelegram()}
                        >
                          {isSavingTg ? 'Registering with Telegram...' : 'Connect Telegram Bot ↗'}
                        </button>
                        {tgChannel && (
                          <button
                            className="btn btn-danger"
                            type="button"
                            onClick={async () => {
                              await updateChannelStatus(tgChannel.id, { status: 'disabled' });
                              await loadWorkspace();
                              flash('Telegram channel paused.');
                            }}
                          >
                            Disconnect
                          </button>
                        )}
                      </div>

                      {tgChannel?.status === 'connected' && (
                        <div style={{ marginTop: 18, padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>✓ Live Webhook Configured</div>
                          <div className="mono" style={{ fontSize: 11, marginTop: 4, wordBreak: 'break-all' }}>
                            https://api.tanat.space/api/webhooks/telegram/{tgChannel.id}
                          </div>
                          {tgChannel.last_seen_at && (
                            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                              Last message handled: {new Date(tgChannel.last_seen_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ws-card">
                      {tgChannel?.status === 'connected' ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3>How to Test Your Bot</h3>
                            <span className="ws-pill connected">Ready to Chat</span>
                          </div>

                          <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                            Your Telegram bot is live and connected directly to your Tanat agent. Follow these steps to test it now:
                          </p>

                          <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 14 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                              Step 1: Open the bot in Telegram
                            </div>
                            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px 0' }}>
                              {botUsername
                                ? `Click below to launch @${botUsername} directly in your Telegram app:`
                                : 'Open Telegram on your phone or desktop and open the bot you created with @BotFather.'}
                            </p>
                            {botUsername ? (
                              <a
                                href={`https://t.me/${botUsername}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              >
                                <span>Open @{botUsername} in Telegram ↗</span>
                              </a>
                            ) : (
                              <a
                                href="https://t.me"
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm"
                              >
                                Open Telegram ↗
                              </a>
                            )}
                          </div>

                          <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 14 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                              Step 2: Send your first message
                            </div>
                            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 8px 0' }}>
                              Click <strong>START</strong> at the bottom of the chat or type <code>/start</code>. Then test asking a real customer question:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ padding: '6px 10px', background: 'var(--card-bg)', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)' }}>
                                <em>&quot;What products or services do you offer?&quot;</em>
                              </div>
                              <div style={{ padding: '6px 10px', background: 'var(--card-bg)', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)' }}>
                                <em>&quot;What are your business hours or pricing?&quot;</em>
                              </div>
                              <div style={{ padding: '6px 10px', background: 'var(--card-bg)', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)' }}>
                                <em>&quot;Can you help me with a return or refund?&quot;</em>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                              Step 3: Check live execution telemetry
                            </div>
                            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px 0' }}>
                              Every message handled in Telegram is logged with token counts, execution latency, and exact knowledge sources used.
                            </p>
                            <button
                              className="btn btn-sm"
                              type="button"
                              onClick={() => {
                                setSection('activity');
                                setActivityTab('runs');
                              }}
                            >
                              View Live Runs &amp; Telemetry →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3>How to get your Bot Token in 30 seconds</h3>
                          <ol style={{ paddingLeft: 18, lineHeight: 1.8, fontSize: 13, marginTop: 12 }}>
                            <li>Open the Telegram app and search for <strong>@BotFather</strong> (verified with blue checkmark).</li>
                            <li>Click <strong>Start</strong> and send the command: <code>/newbot</code></li>
                            <li>Give your bot a friendly name (e.g. <em>Acme Support</em>) and a unique username ending in <code>bot</code> (e.g. <em>acme_support_bot</em>).</li>
                            <li>BotFather will reply with an <strong>HTTP API Token</strong> formatted like <code>123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>.</li>
                            <li>Paste that token on the left and click <strong>Connect Telegram Bot</strong>. That's it!</li>
                          </ol>

                          <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Shared Brain</div>
                            <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
                              Your Telegram bot automatically answers using the knowledge base, policies, and FAQs you upload in Tanat. No separate training or prompt duplication required.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: WHATSAPP BUSINESS */}
                {activeChannelTab === 'whatsapp' && (
                  <div className="ws-grid-2">
                    <div className="ws-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3>Configure WhatsApp Cloud API</h3>
                        <span className={`ws-pill ${waChannel?.status === 'connected' ? 'connected' : 'pending'}`}>
                          {waChannel?.status === 'connected' ? 'Active & Live' : 'Not Connected'}
                        </span>
                      </div>
                      <p style={{ marginBottom: 14 }}>
                        Connect your official Meta WhatsApp Business account. Inbound customer chats are processed by your agent and replies are sent automatically.
                      </p>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>PHONE NUMBER ID</label>
                        <input
                          className="input"
                          style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                          placeholder="e.g. 104928492849284"
                          value={waPhoneId}
                          onChange={(e) => setWaPhoneId(e.target.value)}
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>PERMANENT SYSTEM ACCESS TOKEN</label>
                        <input
                          type="password"
                          className="input"
                          style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                          placeholder="EAAB..."
                          value={waAccessToken}
                          onChange={(e) => setWaAccessToken(e.target.value)}
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>WEBHOOK VERIFY TOKEN</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            className="input"
                            style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                            value={waVerifyToken}
                            onChange={(e) => setWaVerifyToken(e.target.value)}
                          />
                          <button
                            className="btn btn-sm"
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(waVerifyToken);
                              flash('Copied verify token.');
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', marginBottom: 5 }}>META APP SECRET (OPTIONAL FOR HMAC)</label>
                        <input
                          type="password"
                          className="input"
                          style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                          placeholder="Your Meta App Secret"
                          value={waAppSecret}
                          onChange={(e) => setWaAppSecret(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={isSavingWa}
                          onClick={() => void handleConnectWhatsApp()}
                        >
                          {isSavingWa ? 'Saving...' : 'Save & Activate WhatsApp ↗'}
                        </button>
                      </div>
                    </div>

                    <div className="ws-card">
                      <h3>Meta Developer Setup Guide</h3>
                      <ol style={{ paddingLeft: 18, lineHeight: 1.8, fontSize: 13, marginTop: 12 }}>
                        <li>Log into <strong>developers.facebook.com</strong> and open your Business App.</li>
                        <li>In the left sidebar, click <strong>WhatsApp &gt; API Setup</strong>.</li>
                        <li>Copy your <strong>Phone number ID</strong> and paste it on the left.</li>
                        <li>Under <strong>Configuration &gt; Webhook</strong>, click <strong>Edit</strong> and enter:</li>
                      </ol>

                      <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginTop: 8, marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>CALLBACK URL:</div>
                        <div className="mono" style={{ fontSize: 11, wordBreak: 'break-all', marginTop: 2 }}>
                          https://api.tanat.space/api/webhooks/whatsapp/{waChannel?.id || selectedInstId || 'channel_id'}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>VERIFY TOKEN:</div>
                        <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                          {waVerifyToken}
                        </div>
                      </div>

                      <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                        5. Click <strong>Verify and Save</strong> in Meta, then click <strong>Manage Webhook fields</strong> and check the <code>messages</code> box.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 4: SLACK WORKSPACE */}
                {activeChannelTab === 'slack' && (() => {
                  const slackWebhookUrl = `https://api.tanat.space/api/webhooks/slack/${slackChannel?.id || selectedInstId || 'channel_id'}`;
                  const currentAgent = installations.find((i) => i.id === selectedInstId);
                  const botName = currentAgent?.agent_name || 'Tanat Assistant';
                  const slackManifestJson = JSON.stringify(
                    {
                      display_information: {
                        name: botName,
                        description: 'AI operations & knowledge assistant powered by Tanat',
                        background_color: '#0C0D0B',
                      },
                      features: {
                        app_home: {
                          home_tab_enabled: false,
                          messages_tab_enabled: true,
                          messages_tab_read_only_enabled: false,
                        },
                        bot_user: {
                          display_name: botName,
                          always_online: true,
                        },
                      },
                      oauth_config: {
                        scopes: {
                          bot: [
                            'chat:write',
                            'app_mentions:read',
                            'im:history',
                            'im:read',
                            'im:write',
                            'channels:history',
                          ],
                        },
                      },
                      settings: {
                        event_subscriptions: {
                          request_url: slackWebhookUrl,
                          bot_events: ['app_mention', 'message.im', 'message.channels'],
                        },
                        org_deploy_enabled: false,
                        socket_mode_enabled: false,
                        token_rotation_enabled: false,
                      },
                    },
                    null,
                    2,
                  );

                  return (
                    <div className="ws-grid-2">
                      <div className="ws-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3>Connect Slack Workspace</h3>
                          <span className={`ws-pill ${slackChannel?.status === 'connected' ? 'connected' : 'pending'}`}>
                            {slackChannel?.status === 'connected' ? 'Active & Live' : 'Not Connected'}
                          </span>
                        </div>

                        <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 14, fontSize: 12.5, lineHeight: 1.5 }}>
                          <strong>Where to configure:</strong> Slack apps are managed in your web browser at{' '}
                          <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 600 }}>
                            api.slack.com/apps ↗
                          </a>{' '}
                          (not inside the Slack desktop application).
                        </div>

                        <div style={{ marginBottom: 12 }}>
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

                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 5 }}>
                            BOT USER OAUTH TOKEN (STARTS WITH <code>xoxb-</code>)
                          </label>
                          <input
                            type="password"
                            className="input"
                            style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                            placeholder="xoxb-1234567890-..."
                            value={slackBotToken}
                            onChange={(e) => setSlackBotToken(e.target.value)}
                          />
                          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                            Found in <strong>api.slack.com/apps</strong> &gt; Your App &gt; <strong>OAuth &amp; Permissions</strong>.
                          </p>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', marginBottom: 5 }}>SLACK SIGNING SECRET</label>
                          <input
                            type="password"
                            className="input"
                            style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                            placeholder="32-character secret"
                            value={slackSigningSecret}
                            onChange={(e) => setSlackSigningSecret(e.target.value)}
                          />
                          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                            Found in <strong>Basic Information</strong> &gt; <strong>App Credentials</strong> &gt; <strong>Signing Secret</strong>.
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            className="btn btn-primary"
                            type="button"
                            disabled={isSavingSlack}
                            onClick={() => void handleConnectSlack()}
                          >
                            {isSavingSlack ? 'Saving...' : 'Save & Activate Slack ↗'}
                          </button>
                          {slackChannel && (
                            <button
                              className="btn btn-danger"
                              type="button"
                              onClick={async () => {
                                await updateChannelStatus(slackChannel.id, { status: 'disabled' });
                                await loadWorkspace();
                                flash('Slack channel paused.');
                              }}
                            >
                              Disconnect
                            </button>
                          )}
                        </div>

                        {slackChannel?.status === 'connected' && (
                          <div style={{ marginTop: 18, padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>✓ Live Events Webhook Active</div>
                            <div className="mono" style={{ fontSize: 11, marginTop: 4, wordBreak: 'break-all' }}>
                              {slackWebhookUrl}
                            </div>
                            {slackChannel.last_seen_at && (
                              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                                Last message handled: {new Date(slackChannel.last_seen_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ws-card">
                        {slackChannel?.status === 'connected' ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <h3>How to Test Your Slack Bot</h3>
                              <span className="ws-pill connected">Ready to Test</span>
                            </div>

                            <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                              Your Slack app is connected! Test it right inside your Slack workspace using either method:
                            </p>

                            <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 14 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                                Option 1: Direct Message (Private 1-on-1)
                              </div>
                              <ol style={{ paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}>
                                <li>Open your regular Slack app (desktop or browser).</li>
                                <li>In the left sidebar under <strong>Apps</strong>, click <strong>+ Add apps</strong> and select your bot.</li>
                                <li>Send any business inquiry (e.g. <em>&quot;What is our refund process?&quot;</em>).</li>
                                <li>The agent will reply directly in the chat thread.</li>
                              </ol>
                            </div>

                            <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 14 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                                Option 2: In Any Public or Private Channel
                              </div>
                              <ol style={{ paddingLeft: 18, fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}>
                                <li>Go to the Slack channel (e.g. <code>#general</code> or <code>#team-help</code>).</li>
                                <li>Type: <code>/invite @{botName}</code> and press Enter.</li>
                                <li>Mention the bot: <code>@{botName} Can you summarize our standard work hours?</code></li>
                                <li>The bot will reply in the thread, visible to the whole channel.</li>
                              </ol>
                            </div>

                            <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                                Check Live Run Telemetry
                              </div>
                              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px 0' }}>
                                View token usage, model inference speed, and knowledge source references for Slack interactions:
                              </p>
                              <button
                                className="btn btn-sm"
                                type="button"
                                onClick={() => {
                                  setSection('activity');
                                  setActivityTab('runs');
                                }}
                              >
                                View Live Runs &amp; Telemetry →
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <h3>Recommended: 1-Click App Manifest</h3>
                              <span className="ws-pill connected" style={{ fontSize: 10 }}>Fastest</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                              Skip manual menu hunting! Paste this ready-to-use Manifest in Slack to configure permissions, bot users, and webhook URLs in seconds:
                            </p>

                            <ol style={{ paddingLeft: 18, lineHeight: 1.75, fontSize: 12.5, marginBottom: 12 }}>
                              <li>
                                Open{' '}
                                <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 600 }}>
                                  api.slack.com/apps ↗
                                </a>{' '}
                                in your browser.
                              </li>
                              <li>
                                Click <strong>Create an App</strong> → select <strong>Paste a manifest</strong>.
                              </li>
                              <li>Pick your workspace, switch to the <strong>JSON</strong> tab, and paste the manifest below:</li>
                            </ol>

                            <pre className="ws-CodeBox" style={{ maxHeight: 180, fontSize: 11, marginBottom: 10 }}>
                              {slackManifestJson}
                            </pre>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                              <button
                                className="btn btn-sm btn-primary"
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(slackManifestJson);
                                  flash('Copied Slack Manifest JSON to clipboard.');
                                }}
                              >
                                Copy Manifest JSON
                              </button>
                              <a
                                href="https://api.slack.com/apps"
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm"
                              >
                                Open Slack Apps ↗
                              </a>
                            </div>

                            <ol start={4} style={{ paddingLeft: 18, lineHeight: 1.75, fontSize: 12.5, color: 'var(--muted)' }}>
                              <li>Click <strong>Next</strong> → <strong>Create</strong>.</li>
                              <li>Click <strong>Install to Workspace</strong> → <strong>Allow</strong>.</li>
                              <li>
                                Copy the <strong>Bot User OAuth Token</strong> (<code>xoxb-...</code> under <em>OAuth &amp; Permissions</em>) and <strong>Signing Secret</strong> (under <em>Basic Information → App Credentials</em>), paste them on the left, and click <strong>Save &amp; Activate Slack</strong>.
                              </li>
                              <li>
                                Direct Messages are pre-enabled in the manifest — open your bot under <strong>Apps</strong> in Slack to test, or run <code>/invite @{botName}</code> in any channel.
                              </li>
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Configured Agent Channels Grid */}
                <div className="ws-card" style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3>All Connected Channels ({channels.length})</h3>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Each channel routes to your active agent installations
                    </div>
                  </div>
                  <div className="ws-grid-3">
                    {channels.map((ch) => {
                      const type = ch.channel || ch.channel_type || 'channel';

                      return (
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
                              alignItems: 'center',
                              marginBottom: 8,
                            }}
                          >
                            <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              {getBrandIcon(type, 16)}
                              <span style={{ textTransform: 'capitalize' }}>{type}</span>
                            </span>
                            <span className={`ws-pill ${ch.status}`}>{ch.status}</span>
                          </div>
                          <div className="mono muted" style={{ fontSize: 10.5, marginBottom: 6 }}>
                            Channel ID: {ch.id}
                          </div>
                          <div className="mono muted" style={{ fontSize: 10.5, marginBottom: 10 }}>
                            Installation: {ch.installation_id}
                          </div>
                          {ch.last_seen_at && (
                            <div className="muted" style={{ fontSize: 10.5, marginBottom: 10 }}>
                              Active: {new Date(ch.last_seen_at).toLocaleTimeString()}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-sm"
                              onClick={async () => {
                                const next = ch.status === 'connected' || ch.status === 'active' ? 'disabled' : 'connected';
                                await updateChannelStatus(ch.id, { status: next });
                                await loadWorkspace();
                              }}
                            >
                              {ch.status === 'connected' || ch.status === 'active' ? 'Pause' : 'Resume'}
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                if (type === 'telegram') setActiveChannelTab('telegram');
                                else if (type === 'whatsapp') setActiveChannelTab('whatsapp');
                                else if (type === 'slack') setActiveChannelTab('slack');
                                else setActiveChannelTab('website');
                              }}
                            >
                              Configure
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

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
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: '#faf8f6',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getBrandIcon(`${int.type} ${int.name}`, 17)}
                        </span>
                        <span className="mono" style={{ fontSize: 10.5 }}>
                          {int.category.toUpperCase()}
                        </span>
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
          {section === 'privacy' && <PrivacyCentre />}

          {section === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}
