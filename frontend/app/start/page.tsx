'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../landing.css';
import { CheckIcon, ArrowIcon } from '@/components/brand/Logo';
import {
  CursorLogo,
  LovableLogo,
  ShopifyLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WebflowLogo,
  WhatsAppLogo,
  WidgetLogo,
} from '@/components/brand/PlatformLogos';
import { FormattedPreview } from '@/components/FormattedPreview';
import { getSuggestedQuestions } from '@/lib/chat-suggestions';
import {
  ApiError,
  completeOnboarding,
  createSession,
  getOnboarding,
  getStoredKey,
  PUBLIC_BASE_URL,
  requestOtp,
  saveOnboardingState,
  sendMessage,
  verifyOtp,
} from '@/lib/api';
import type { AgentTemplate } from '@/lib/types';

const INDUSTRIES = [
  { id: 'ecommerce', label: 'E-commerce & Retail', examples: 'Online stores, D2C brands, retail catalogs' },
  { id: 'saas', label: 'SaaS & Technology', examples: 'B2B software, developer tools, cloud platforms' },
  { id: 'healthcare', label: 'Healthcare & Clinics', examples: 'Medical practices, dental clinics, wellness centers' },
  { id: 'real_estate', label: 'Real Estate & Property', examples: 'Brokerages, property management, leasing teams' },
  { id: 'hospitality', label: 'Hospitality, Travel & Restaurants', examples: 'Hotels, restaurants, travel agencies, venues' },
  { id: 'education', label: 'Education & Training', examples: 'Schools, bootcamps, coaching, learning platforms' },
  { id: 'finance', label: 'Financial Services & Fintech', examples: 'Advisory firms, accounting, lending, payments' },
  { id: 'logistics', label: 'Logistics, Delivery & Supply Chain', examples: 'Freight, courier networks, warehousing, fleet ops' },
  { id: 'agencies', label: 'Agencies, Consulting & Professional Services', examples: 'Marketing agencies, IT consultancies, studios' },
  { id: 'legal', label: 'Legal & Compliance Services', examples: 'Law firms, compliance practices, contract teams' },
  { id: 'hr_recruiting', label: 'HR, Recruiting & Staffing', examples: 'Talent agencies, people ops, internal HR teams' },
  { id: 'manufacturing', label: 'Manufacturing & Construction', examples: 'Industrial suppliers, contractors, field ops' },
  { id: 'media', label: 'Media, Creators & Communities', examples: 'Publishers, creator brands, membership communities' },
  { id: 'nonprofit', label: 'Nonprofits & Public Organizations', examples: 'Foundations, NGOs, community programs' },
  { id: 'automotive', label: 'Automotive & Mobility', examples: 'Dealerships, service centers, fleet rentals' },
  { id: 'fitness_beauty', label: 'Fitness, Beauty & Personal Services', examples: 'Gyms, salons, spas, studios' },
  { id: 'other', label: 'Other / Multi-Disciplinary Business', examples: 'Custom operations, holdings, hybrid businesses' },
];

const CAPABILITY_GROUPS = [
  {
    group: 'Customer Experience',
    items: [
      { id: 'customer_questions', label: 'Answer customer questions', note: 'Policies, pricing, services, troubleshooting' },
      { id: 'qualify_leads', label: 'Qualify leads and recommend products/services', note: 'Capture intent, recommend plans, route buyers' },
      { id: 'book_appointments', label: 'Book appointments or reservations', note: 'Collect intake info and coordinate slots' },
      { id: 'orders_deliveries', label: 'Help customers with orders, deliveries, or requests', note: 'Track status, returns, and service requests' },
      { id: 'collect_feedback', label: 'Collect customer information or feedback', note: 'Structured intake forms and surveys' },
    ],
  },
  {
    group: 'Business Operations',
    items: [
      { id: 'hr_employee', label: 'Support employees with HR and company policies', note: 'Leave policies, onboarding, benefits' },
      { id: 'it_support', label: 'Help staff with internal IT or operational questions', note: 'Access requests, SOPs, runbooks' },
      { id: 'finance_admin', label: 'Assist with finance, invoicing, or procurement workflows', note: 'Vendor checks, spend approvals, payment links' },
      { id: 'summarize_reports', label: 'Summarize documents, reports, or messages', note: 'Executive briefings and operational digests' },
    ],
  },
  {
    group: 'Knowledge & Productivity',
    items: [
      { id: 'search_docs', label: 'Search company documents and SOPs', note: 'Instant citations from internal handbooks' },
      { id: 'draft_replies', label: 'Draft responses, emails, or proposals', note: 'Consistent brand voice for your team' },
      { id: 'track_tasks', label: 'Track tasks, requests, or approvals', note: 'Human-in-the-loop governance' },
    ],
  },
  {
    group: 'Custom Workflows',
    items: [
      { id: 'custom_workflow', label: 'Connect to our tools or APIs', note: 'Webhooks, CRM, Shopify, or custom endpoints' },
      { id: 'custom_agent', label: 'Create a custom agent for a specific workflow', note: 'Tailored instructions and permissions' },
      { id: 'not_sure', label: 'I’m not sure yet — recommend for my business', note: 'Let Tanat suggest the best starting blueprint' },
    ],
  },
];

const DEFAULT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'tpl_customer_support',
    name: 'Customer Support Agent',
    slug: 'customer-support-agent',
    category: 'customer',
    tagline: 'Resolve customer questions, policies, and service issues 24/7.',
    description: 'Answers FAQs accurately using your business knowledge, triages support issues, and escalates complex requests.',
    recommended_for_industries: ['ecommerce', 'saas', 'healthcare', 'hospitality', 'logistics', 'finance', 'other'],
    recommended_for_responsibilities: ['customer_questions', 'orders_deliveries', 'collect_feedback'],
    default_tone: 'friendly',
    default_tools: ['search_knowledge', 'escalate_to_human'],
    suggested_knowledge: ['FAQs', 'Return & Refund Policy', 'Service Hours & Contact Info'],
    suggested_channels: ['website', 'whatsapp', 'email'],
    safeguards: ['Never invent policy terms', 'Escalate billing disputes to a human'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_sales_lead',
    name: 'Sales & Lead Generation Agent',
    slug: 'sales-lead-agent',
    category: 'customer',
    tagline: 'Qualify prospects, recommend services, and capture high-intent leads.',
    description: 'Engages website and messaging visitors, understands their needs, recommends the right offering, and captures contact details.',
    recommended_for_industries: ['saas', 'agencies', 'real_estate', 'education', 'automotive', 'ecommerce'],
    recommended_for_responsibilities: ['qualify_leads', 'customer_questions', 'collect_feedback'],
    default_tone: 'professional',
    default_tools: ['search_knowledge', 'capture_lead', 'create_payment_link'],
    suggested_knowledge: ['Product / Service Catalog', 'Pricing Tiers', 'Case Studies'],
    suggested_channels: ['website', 'whatsapp', 'telegram'],
    safeguards: ['Never promise unauthorized discounts', 'Always confirm scope before quoting'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_booking_intake',
    name: 'Booking & Appointment Agent',
    slug: 'booking-appointment-agent',
    category: 'customer',
    tagline: 'Coordinate appointments, reservations, and client intake smoothly.',
    description: 'Helps clients check preparation steps, collect intake details, and schedule or reschedule appointments.',
    recommended_for_industries: ['healthcare', 'hospitality', 'fitness_beauty', 'real_estate', 'legal', 'agencies'],
    recommended_for_responsibilities: ['book_appointments', 'customer_questions', 'collect_feedback'],
    default_tone: 'warm',
    default_tools: ['search_knowledge', 'request_booking', 'escalate_to_human'],
    suggested_knowledge: ['Service Menu & Duration', 'Cancellation Policy', 'Location & Prep Guide'],
    suggested_channels: ['website', 'whatsapp', 'telegram'],
    safeguards: ['Do not provide medical or legal diagnosis', 'Confirm timezone and cancellation policy'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_order_management',
    name: 'Order & Delivery Assistant',
    slug: 'order-delivery-agent',
    category: 'customer',
    tagline: 'Assist customers with order status, delivery windows, returns, and exchanges.',
    description: 'Guides customers through shipping policies, return eligibility, and order modifications with human approval on refunds.',
    recommended_for_industries: ['ecommerce', 'logistics', 'manufacturing', 'hospitality'],
    recommended_for_responsibilities: ['orders_deliveries', 'customer_questions'],
    default_tone: 'friendly',
    default_tools: ['search_knowledge', 'propose_refund', 'escalate_to_human'],
    suggested_knowledge: ['Shipping Zones & SLA', 'Return & Exchange Policy', 'Product Care Guide'],
    suggested_channels: ['website', 'whatsapp', 'shopify'],
    safeguards: ['Refunds and credits always require human approval', 'Never fabricate tracking numbers'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_hr_people',
    name: 'HR & People Support Agent',
    slug: 'hr-people-agent',
    category: 'internal',
    tagline: 'Answer employee questions on handbook policies, leave, onboarding, and benefits.',
    description: 'Internal assistant for employees to find company policies, PTO rules, and onboarding checklists.',
    recommended_for_industries: ['hr_recruiting', 'saas', 'manufacturing', 'healthcare', 'agencies', 'other'],
    recommended_for_responsibilities: ['hr_employee', 'search_docs'],
    default_tone: 'warm',
    default_tools: ['search_knowledge', 'escalate_to_human'],
    suggested_knowledge: ['Employee Handbook', 'Leave & PTO Policy', 'Onboarding Checklist'],
    suggested_channels: ['slack', 'api'],
    safeguards: ['Never disclose confidential salary data', 'Escalate grievances to HR leadership'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_operations_admin',
    name: 'Operations & Workflow Agent',
    slug: 'operations-workflow-agent',
    category: 'internal',
    tagline: 'Coordinate SOPs, vendor workflows, dispatch checklists, and internal approvals.',
    description: 'Helps operations teams follow standard operating procedures, triage requests, and route high-impact actions for approval.',
    recommended_for_industries: ['logistics', 'manufacturing', 'hospitality', 'real_estate', 'other'],
    recommended_for_responsibilities: ['it_support', 'track_tasks', 'summarize_reports'],
    default_tone: 'concise',
    default_tools: ['search_knowledge', 'escalate_to_human'],
    suggested_knowledge: ['Standard Operating Procedures (SOPs)', 'Escalation Matrix', 'Vendor Directory'],
    suggested_channels: ['slack', 'api'],
    safeguards: ['Require human approval before operational changes'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_finance_procurement',
    name: 'Finance & Billing Assistant',
    slug: 'finance-billing-agent',
    category: 'internal',
    tagline: 'Handle invoice questions, payment links, expense policies, and governed payouts.',
    description: 'Assists with billing inquiries, expense policy lookups, and payment/refund proposals under human approval and spend caps.',
    recommended_for_industries: ['finance', 'saas', 'agencies', 'ecommerce', 'manufacturing'],
    recommended_for_responsibilities: ['finance_admin', 'track_tasks'],
    default_tone: 'formal',
    default_tools: ['search_knowledge', 'create_payment_link', 'propose_transfer'],
    suggested_knowledge: ['Billing & Invoice FAQ', 'Expense Reimbursement Policy', 'Approval Thresholds'],
    suggested_channels: ['website', 'slack', 'api'],
    safeguards: ['Every financial transfer or refund requires human approval', 'Enforce workspace spending limits'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_knowledge_research',
    name: 'Knowledge & Documentation Assistant',
    slug: 'knowledge-research-agent',
    category: 'knowledge',
    tagline: 'Search, synthesize, and cite company documents, SOPs, and policies.',
    description: 'Turns internal documentation, policies, and reference guides into an instant, source-cited Q&A assistant.',
    recommended_for_industries: ['saas', 'legal', 'education', 'healthcare', 'agencies', 'nonprofit'],
    recommended_for_responsibilities: ['search_docs', 'summarize_reports', 'draft_replies'],
    default_tone: 'concise',
    default_tools: ['search_knowledge'],
    suggested_knowledge: ['Company Wiki / SOPs', 'Policy Documents', 'Product Guides'],
    suggested_channels: ['website', 'slack', 'api'],
    safeguards: ['Always cite knowledge sources', 'State clearly when information is not in the knowledge base'],
    system_prompt_template: '',
  },
  {
    id: 'tpl_custom',
    name: 'Custom Business Agent',
    slug: 'custom-business-agent',
    category: 'custom',
    tagline: 'Design a bespoke agent around your exact workflow, tools, and rules.',
    description: 'Start from a clean slate and define custom responsibilities, knowledge sources, channels, and approval rules.',
    recommended_for_industries: ['other'],
    recommended_for_responsibilities: ['custom_workflow', 'custom_agent'],
    default_tone: 'professional',
    default_tools: ['search_knowledge', 'escalate_to_human'],
    suggested_knowledge: ['Business Overview', 'Workflow Instructions', 'FAQs'],
    suggested_channels: ['website', 'api'],
    safeguards: ['Require human approval for sensitive actions'],
    system_prompt_template: '',
  },
];

type ChannelOption = {
  id: 'website' | 'whatsapp' | 'telegram' | 'slack' | 'shopify' | 'email' | 'api' | 'custom';
  group: 'Customer Communication' | 'Team Communication' | 'Business Applications';
  title: string;
  note: string;
  badge: 'Available now' | 'Connector' | 'Beta';
};

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    id: 'website',
    group: 'Customer Communication',
    title: 'Website widget',
    note: 'Embed a style-isolated chat bubble on any website with one script tag.',
    badge: 'Available now',
  },
  {
    id: 'whatsapp',
    group: 'Customer Communication',
    title: 'WhatsApp Business',
    note: 'Connect WhatsApp Cloud API for customer conversations and updates.',
    badge: 'Connector',
  },
  {
    id: 'telegram',
    group: 'Customer Communication',
    title: 'Telegram Bot',
    note: 'Deploy your agent as an interactive Telegram bot for customers or community.',
    badge: 'Connector',
  },
  {
    id: 'email',
    group: 'Customer Communication',
    title: 'Email Support',
    note: 'Draft and triage inbound support and inquiry emails.',
    badge: 'Beta',
  },
  {
    id: 'slack',
    group: 'Team Communication',
    title: 'Slack Workspace',
    note: 'Give employees an internal assistant inside Slack channels.',
    badge: 'Connector',
  },
  {
    id: 'shopify',
    group: 'Business Applications',
    title: 'Shopify & Storefronts',
    note: 'Embed on Shopify themes and connect catalog/order workflows.',
    badge: 'Connector',
  },
  {
    id: 'api',
    group: 'Business Applications',
    title: 'Custom App / REST & MCP API',
    note: 'Integrate via REST API, publishable keys, llms.txt, and Model Context Protocol.',
    badge: 'Available now',
  },
];

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  website: <WidgetLogo size={20} />,
  whatsapp: <WhatsAppLogo size={20} />,
  telegram: <TelegramLogo size={20} />,
  email: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  slack: <SlackLogo size={20} />,
  shopify: <ShopifyLogo size={20} />,
  api: <CursorLogo size={20} />,
};

const STEP_LABELS = [
  '1. Welcome',
  '2. Business Info',
  '3. AI Goals',
  '4. Recommend Agents',
  '5. Configure Agent',
  '6. Knowledge',
  '7. Channels',
  '8. Permissions',
  '9. Test Agent',
  '10. Deploy Summary',
  '11. Workspace Ready',
];

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auth status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Step 2: Business Information
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('saas');
  const [businessDescription, setBusinessDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [country, setCountry] = useState('United States');
  const [timezone, setTimezone] = useState('UTC');

  // Step 3: Capabilities
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([
    'customer_questions',
    'qualify_leads',
  ]);
  const [openCapabilityGroups, setOpenCapabilityGroups] = useState<string[]>([
    'Customer Experience',
  ]);

  // Step 4: Recommended Templates
  const [templates, setTemplates] = useState<AgentTemplate[]>(DEFAULT_TEMPLATES);
  const [primaryTemplateId, setPrimaryTemplateId] = useState('tpl_customer_support');
  const [additionalTemplates, setAdditionalTemplates] = useState<string[]>([]);
  const [openAgentGroups, setOpenAgentGroups] = useState<string[]>(['Recommended for you']);
  const [openConfigSections, setOpenConfigSections] = useState<string[]>(['Rules & escalation']);
  const [openKnowledgeFaq, setOpenKnowledgeFaq] = useState(false);
  const [openChannelGroups, setOpenChannelGroups] = useState<string[]>(['Ready now']);
  const [openGovGroups, setOpenGovGroups] = useState<string[]>(['Allowed Actions', 'Human Approval Required']);

  // Step 5: Configure First Agent
  const [agentName, setAgentName] = useState('Customer Support Agent');
  const [agentPurpose, setAgentPurpose] = useState(
    'Answer customer questions accurately using our business knowledge, help with requests, and escalate complex issues to our team.',
  );
  const [tone, setTone] = useState<'professional' | 'friendly' | 'concise' | 'warm' | 'formal' | 'executive'>('friendly');
  const [responsibilitiesText, setResponsibilitiesText] = useState(
    'Answer common questions clearly\nGuide users using verified company policies\nEscalate sensitive or complex issues to a human team member',
  );
  const [mustNotDoText, setMustNotDoText] = useState(
    'Never invent pricing, policies, or legal commitments\nNever execute financial payouts without human approval',
  );
  const [escalationRules, setEscalationRules] = useState(
    'Escalate to a human team member whenever a customer asks for a manager, reports an urgent incident, or requests an exception outside standard policy.',
  );
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');

  // Step 6: Business Knowledge
  const [knowledgeTitle, setKnowledgeTitle] = useState('Business Policies & Overview');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([
    {
      question: 'What are your support hours and response times?',
      answer: 'Our AI assistant is available 24/7. Human specialists review escalated requests Monday through Friday, 9am–6pm.',
    },
  ]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // Step 7: Channels
  const [selectedChannels, setSelectedChannels] = useState<
    Array<'website' | 'whatsapp' | 'telegram' | 'slack' | 'shopify' | 'email' | 'api' | 'custom'>
  >(['website', 'api']);
  const [allowedDomainsText, setAllowedDomainsText] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : 'https://tanat.space',
  );

  // Step 8: Permissions & Governance
  const [readOnlyPerms, setReadOnlyPerms] = useState<string[]>([
    'Read approved business knowledge and FAQs',
    'Recall verified customer memory within this workspace',
  ]);
  const [actionPerms, setActionPerms] = useState<string[]>([
    'Capture lead & intake details',
    'Draft responses and cite policy sources',
  ]);
  const [approvalPerms, setApprovalPerms] = useState<string[]>([
    'Require human approval before any refund, credit, or payment transfer',
    'Require human review for policy exceptions',
  ]);
  const [restrictedPerms, setRestrictedPerms] = useState<string[]>([
    'Never modify workspace spending limits or security keys',
    'Never fabricate order statuses, balances, or legal advice',
  ]);

  // Step 9: Interactive Test Agent
  const [testMessages, setTestMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: Array<{ id: string; title: string; type: string }>;
      durationMs?: number;
    }>
  >([]);
  const [testInput, setTestInput] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);

  // Step 10/11: Deploy Result
  const [deployResult, setDeployResult] = useState<{
    publishable_key: string;
    installation_id: string;
    agent_id: string;
    widget_snippet: string;
  } | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    const token = getStoredKey();
    if (!token) return;
    setIsAuthenticated(true);
    void (async () => {
      try {
        const status = await getOnboarding();
        if (status.tenant?.name && status.tenant.name !== 'Workspace') {
          setBusinessName(status.tenant.name);
        }
        if (status.templates?.length) {
          setTemplates(status.templates);
        }
        const ob = status.onboarding;
        if (ob) {
          if (ob.industry) setIndustry(ob.industry);
          if (ob.business_description) setBusinessDescription(ob.business_description);
          if (ob.website_url) setWebsiteUrl(ob.website_url);
          if (ob.business_email) setEmail(ob.business_email);
          if (ob.country) setCountry(ob.country);
          if (ob.timezone) setTimezone(ob.timezone);
          if (ob.selected_capabilities?.length) {
            setSelectedCapabilities(ob.selected_capabilities);
          }
          if (ob.template_id) setPrimaryTemplateId(ob.template_id);
          if (ob.selected_channels?.length) {
            setSelectedChannels(
              ob.selected_channels as Array<
                'website' | 'whatsapp' | 'telegram' | 'slack' | 'shopify' | 'email' | 'api' | 'custom'
              >,
            );
          }
        }
      } catch {
        // Token may be expired; allow re-authentication in flow
        setIsAuthenticated(false);
      }
    })();
  }, []);

  // Score and sort templates based on industry + selectedCapabilities
  const scoredTemplates = useMemo(() => {
    return templates
      .map((tpl) => {
        let score = 0;
        if (tpl.recommended_for_industries?.includes(industry)) score += 3;
        for (const cap of selectedCapabilities) {
          if (tpl.recommended_for_responsibilities?.includes(cap)) score += 2;
        }
        if (selectedCapabilities.includes('not_sure') && tpl.id === 'tpl_customer_support') {
          score += 4;
        }
        return { ...tpl, recommendation_score: score };
      })
      .sort((a, b) => (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0));
  }, [templates, industry, selectedCapabilities]);

  // Update default agent configuration when primaryTemplateId changes
  function selectPrimaryTemplate(tpl: AgentTemplate) {
    setPrimaryTemplateId(tpl.id);
    setAgentName(tpl.name);
    setAgentPurpose(tpl.description);
    setTone(tpl.default_tone);
    if (tpl.safeguards?.length) {
      setMustNotDoText(tpl.safeguards.join('\n'));
    }
    if (industry === 'healthcare') {
      setMustNotDoText(
        'Do not provide medical diagnosis or emergency clinical advice\nDirect medical emergencies to local emergency services immediately\nNever share patient records across unverified sessions',
      );
    }
  }

  function toggleItem<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  async function persistDraft(nextStep: number) {
    if (!isAuthenticated) return;
    try {
      await saveOnboardingState({
        step: nextStep,
        industry,
        business_description: businessDescription,
        website_url: websiteUrl,
        business_email: email,
        country,
        timezone,
        selected_capabilities: selectedCapabilities,
        template_id: primaryTemplateId,
        tone,
        selected_channels: selectedChannels,
      });
    } catch {
      // Non-blocking draft save
    }
  }

  async function handleSendOtp() {
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Please enter a valid work email address.');
      return;
    }
    setBusy(true);
    try {
      await requestOtp({
        email: email.trim(),
        tenant_name: businessName.trim() || 'My Business Workspace',
      });
      setOtpSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not send verification code. Please check your connection.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    if (otpCode.trim().length !== 6) {
      setError('Enter the 6-digit verification code from your email.');
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(email.trim(), otpCode.trim());
      setIsAuthenticated(true);
      setOtpSent(false);
      await persistDraft(step + 1);
      setStep((s) => s + 1);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Invalid or expired verification code.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function runOnboardingSync() {
    const allowedDomains = allowedDomainsText
      .split(/[\n,]/)
      .map((d) => d.trim())
      .filter(Boolean);

    const res = await completeOnboarding({
      business_name: businessName.trim() || 'My Business',
      industry,
      business_description:
        businessDescription.trim() ||
        `${businessName || 'Our business'} operates in ${industry}.`,
      website_url: websiteUrl.trim() || undefined,
      business_email: email.trim() || undefined,
      country,
      timezone,
      selected_capabilities: selectedCapabilities,
      template_id: primaryTemplateId,
      additional_templates: additionalTemplates,
      agent_name: agentName.trim() || 'Customer Support Agent',
      agent_purpose: agentPurpose.trim(),
      tone,
      responsibilities: responsibilitiesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      must_not_do: mustNotDoText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      escalation_rules: escalationRules.trim(),
      welcome_message: welcomeMessage.trim() || 'Hi! How can I help you today?',
      allowed_domains: allowedDomains.length
        ? allowedDomains
        : [typeof window !== 'undefined' ? window.location.origin : 'https://tanat.space'],
      knowledge_title: knowledgeTitle.trim() || 'Business Knowledge',
      knowledge_text: knowledgeText.trim() || undefined,
      faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      selected_channels: selectedChannels,
      permissions: {
        read_only: readOnlyPerms,
        actions: actionPerms,
        human_approval: approvalPerms,
        restricted: restrictedPerms,
      },
      step: 10,
    });
    setDeployResult(res);
    return res;
  }

  async function handleTestMessage(promptOverride?: string) {
    const text = (promptOverride ?? testInput).trim();
    if (!text) return;
    setError(null);
    setTestBusy(true);
    setTestInput('');
    setTestMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      let currentResult = deployResult;
      if (!currentResult) {
        currentResult = await runOnboardingSync();
      }
      let sessionId = testSessionId;
      if (!sessionId) {
        const session = await createSession({
          installation_id: currentResult.installation_id,
          user_id: 'onboarding_tester',
        });
        sessionId = session.id;
        setTestSessionId(sessionId);
      }
      const reply = await sendMessage(sessionId, text);
      setTestMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply.content,
          sources: reply.sources_used,
          durationMs: reply.duration_ms,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the agent test sandbox. Ensure you are signed in.',
      );
    } finally {
      setTestBusy(false);
    }
  }

  async function handleDeploy() {
    setError(null);
    setBusy(true);
    try {
      await runOnboardingSync();
      setStep(10);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not complete deployment. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function addFaq() {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    setFaqs((prev) => [
      ...prev,
      { question: newFaqQ.trim(), answer: newFaqA.trim() },
    ]);
    setNewFaqQ('');
    setNewFaqA('');
  }

  const vibecoderPrompt = useMemo(() => {
    const pk = deployResult?.publishable_key ?? 'pk_live_your_key';
    const inst = deployResult?.installation_id ?? 'inst_your_agent';
    return `Read ${PUBLIC_BASE_URL}/llms.txt and ${PUBLIC_BASE_URL}/api/mcp
Integrate our Tanat AI agent ("${agentName}") into this application:
1. Embed the Tanat widget script in the root layout:
<script src="${PUBLIC_BASE_URL}/embed/tanat-widget.js" data-key="${pk}" data-agent="${inst}" data-api="${PUBLIC_BASE_URL}" data-theme="light" defer></script>
2. Or use POST ${PUBLIC_BASE_URL}/api/public/v1/sessions and POST ${PUBLIC_BASE_URL}/api/public/v1/sessions/:id/messages with header "X-Tanat-Publishable-Key: ${pk}".`;
  }, [deployResult, agentName]);

  return (
    <div className="start tn-site">
      <aside className="start-aside">
        <div className="tn-hero-wireframe" />
        <span className="tn-pushpin tn-pushpin-left" aria-hidden="true" />
        <span className="tn-pushpin tn-pushpin-right" aria-hidden="true" />
        <div className="tn-pixel-corner" style={{ bottom: 18, right: 24 }} aria-hidden="true" />

        {/* Subtle Floating Platform Logos */}
        <div
          className="tn-float-badge"
          style={{ right: 24, top: 82, width: 44, height: 44, animation: 'tn-float-b 5.8s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <LovableLogo size={22} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 28, bottom: 96, width: 44, height: 44, animation: 'tn-float-a 6.2s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <TelegramLogo size={22} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 86, bottom: 150, width: 42, height: 42, animation: 'tn-float-b 6.5s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <SlackLogo size={20} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 88, top: 140, width: 42, height: 42, animation: 'tn-float-a 5.5s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <WebflowLogo size={20} />
        </div>

        <div className="start-aside-top" style={{ position: 'relative', zIndex: 2 }}>
          <Link href="/" className="tn-brand" style={{ color: '#ffffff' }} aria-label="Tanat home">
            <TanatMascotIcon size={34} />
            <span>Tanat</span>
          </Link>
          <span className="tn-mint-pill">Guided Setup</span>
        </div>

        <h2 style={{ color: '#ffffff', position: 'relative', zIndex: 2 }}>
          Set up your private AI in minutes.
        </h2>
        <p className="start-aside-sub">
          Connect your business info, choose your channels, and go live across
          websites, Telegram, WhatsApp, and Slack — zero infra headaches.
        </p>

        <div className="start-steps" style={{ gap: 6, position: 'relative', zIndex: 2 }}>
          {STEP_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (index <= step || isAuthenticated) setStep(index);
              }}
              className={`start-step ${index === step ? 'active' : ''} ${
                index < step ? 'done' : ''
              }`}
              style={{
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: index <= step || isAuthenticated ? 'pointer' : 'default',
                padding: '4px 0',
              }}
            >
              <span className="start-step-num">
                {index < step ? <CheckIcon size={11} /> : index + 1}
              </span>
              {label}
            </button>
          ))}
        </div>

        <div className="start-aside-foot">
          <div>✓ Works for any industry & team</div>
          <div style={{ marginTop: 6 }}>✓ Grounded in your business knowledge</div>
          <div style={{ marginTop: 6 }}>✓ Human-in-the-loop permissions</div>
        </div>
      </aside>

      <main className="start-main">
        <div className="start-top">
          <span>
            Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
          </span>
          {isAuthenticated ? (
            <Link href="/app">Skip to Workspace Dashboard →</Link>
          ) : (
            <Link href="/login">Already have a workspace? Sign in</Link>
          )}
        </div>

        <div className="start-card" style={{ maxWidth: 760 }}>
          <div className="start-progress" aria-hidden="true">
            {STEP_LABELS.map((name, index) => (
              <i key={name} className={index <= step ? 'done' : ''} />
            ))}
          </div>
          <div style={{ borderTop: '1px dashed var(--tn-border-strong)', margin: '18px 0' }} />

          {/* ── STEP 0: Welcome to Tanat ─────────────────────────────── */}
          {step === 0 && (
            <>
              <span className="t-eyebrow">Step 1 · Welcome</span>
              <h1 style={{ marginTop: 16 }}>
                Set up AI for your business.
              </h1>
              <p>
                Configure your workspace, connect your knowledge, and deploy across
                your channels in minutes — zero infrastructure setup.
              </p>

              <div className="start-summary-grid start-grid-3" style={{ marginTop: 18, marginBottom: 22 }}>
                <div className="start-summary-cell">
                  <strong>1. Business Profile</strong>
                  <span>Industry, services, and goals.</span>
                </div>
                <div className="start-summary-cell">
                  <strong>2. Knowledge & Rules</strong>
                  <span>Policies, FAQs, and guardrails.</span>
                </div>
                <div className="start-summary-cell">
                  <strong>3. Test & Deploy</strong>
                  <span>Sandbox check, then go live.</span>
                </div>
              </div>

              <div className="start-actions">
                <span className="start-hint">~3 min · Auto-saved</span>
                <button
                  className="t-btn t-btn-lime"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  Start setup <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 1: Business Information ─────────────────────────── */}
          {step === 1 && (
            <>
              <span className="t-eyebrow">Step 2 · Business Profile</span>
              <h1 style={{ marginTop: 16 }}>Tell us about your business.</h1>
              <p>
                Used to recommend the right agents and ground responses.
              </p>

              <div className="start-row">
                <div className="start-field">
                  <label htmlFor="biz-name">Business name</label>
                  <input
                    id="biz-name"
                    className="start-input"
                    placeholder="Acme Health / Northwind SaaS"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="start-field">
                  <label htmlFor="biz-industry">Industry</label>
                  <select
                    id="biz-industry"
                    className="start-select"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="start-field">
                <label htmlFor="biz-desc">
                  What do you do? <span className="hint">1–2 sentences</span>
                </label>
                <textarea
                  id="biz-desc"
                  className="start-input"
                  rows={2}
                  style={{ height: 'auto', padding: '12px 14px' }}
                  placeholder="e.g. Outpatient physical therapy across 3 clinics — bookings, insurance checks, and recovery plans."
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                />
              </div>

              <div className="start-row">
                <div className="start-field">
                  <label htmlFor="biz-web">
                    Website <span className="hint">optional</span>
                  </label>
                  <input
                    id="biz-web"
                    className="start-input"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
                <div className="start-field">
                  <label htmlFor="biz-country">Country / Timezone</label>
                  <input
                    id="biz-country"
                    className="start-input"
                    placeholder="United States · EST"
                    value={`${country} (${timezone})`}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              {!isAuthenticated && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 16,
                    borderRadius: 14,
                    background: '#faf8f6',
                    border: '1px dashed #d6d0c8',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>
                    Verify email to save progress
                  </div>
                  <div className="start-row">
                    <div className="start-field" style={{ marginBottom: 0 }}>
                      <label htmlFor="biz-email">Work email</label>
                      <input
                        id="biz-email"
                        className="start-input"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={otpSent}
                      />
                    </div>
                    {otpSent && (
                      <div className="start-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="biz-otp">6-digit code</label>
                        <input
                          id="biz-otp"
                          className="start-input"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && <div className="start-error">{error}</div>}

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(0)}>
                  ← Back
                </button>
                {isAuthenticated ? (
                  <button
                    className="t-btn t-btn-ink"
                    type="button"
                    disabled={businessName.trim().length < 2}
                    onClick={() => {
                      void persistDraft(2);
                      setStep(2);
                    }}
                  >
                    Continue <ArrowIcon />
                  </button>
                ) : otpSent ? (
                  <button
                    className="t-btn t-btn-lime"
                    type="button"
                    disabled={busy || otpCode.length !== 6}
                    onClick={() => void handleVerifyOtp()}
                  >
                    {busy ? 'Verifying…' : 'Verify email & continue'} <ArrowIcon />
                  </button>
                ) : (
                  <button
                    className="t-btn t-btn-ink"
                    type="button"
                    disabled={busy || businessName.trim().length < 2}
                    onClick={() => void handleSendOtp()}
                  >
                    {busy ? 'Sending code…' : 'Send verification code & continue'}{' '}
                    <ArrowIcon />
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── STEP 2: What Do You Want AI to Do? ───────────────────── */}
          {step === 2 && (
            <>
              <span className="t-eyebrow">Step 3 · AI Responsibilities</span>
              <h1 style={{ marginTop: 16 }}>What do you want AI to handle?</h1>
              <p>
                Select all the areas where you want help. Tanat will use these to
                recommend the right agents and pre-configure their capabilities.
              </p>

              <div className="start-accordion" style={{ marginTop: 16 }}>
                {CAPABILITY_GROUPS.map((group) => {
                  const isOpen = openCapabilityGroups.includes(group.group);
                  const selectedInGroup = group.items.filter((item) =>
                    selectedCapabilities.includes(item.id),
                  ).length;

                  return (
                    <div
                      key={group.group}
                      className={`start-accordion-item ${isOpen ? 'open' : ''}`}
                    >
                      <button
                        type="button"
                        className="start-accordion-trigger"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenCapabilityGroups((prev) =>
                            prev.includes(group.group)
                              ? prev.filter((g) => g !== group.group)
                              : [...prev, group.group],
                          )
                        }
                      >
                        <span className="start-accordion-title-wrap">
                          <span className="start-accordion-title">{group.group}</span>
                          <span className="start-accordion-meta">
                            {group.items.length} options
                            {selectedInGroup > 0 && (
                              <span className="start-accordion-count">
                                {selectedInGroup} selected
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="start-accordion-chevron" aria-hidden="true">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        </span>
                      </button>

                      {isOpen && (
                        <div className="start-accordion-panel">
                          <div className="start-accordion-grid">
                            {group.items.map((item) => {
                              const active = selectedCapabilities.includes(item.id);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`start-accordion-cell ${active ? 'selected' : ''}`}
                                  onClick={() =>
                                    setSelectedCapabilities((list) =>
                                      toggleItem(list, item.id),
                                    )
                                  }
                                >
                                  <span className="start-accordion-cell-body">
                                    <span className="start-accordion-cell-title">
                                      {item.label}
                                    </span>
                                    <span className="start-accordion-cell-note">
                                      {item.note}
                                    </span>
                                  </span>
                                  <span className="start-choice-check">
                                    <CheckIcon size={10} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  className="t-btn t-btn-ink"
                  type="button"
                  disabled={selectedCapabilities.length === 0}
                  onClick={() => {
                    const top = scoredTemplates[0];
                    if (top) selectPrimaryTemplate(top);
                    void persistDraft(3);
                    setStep(3);
                  }}
                >
                  See recommended agents <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Recommend Agents ─────────────────────────────── */}
          {step === 3 && (
            <>
              <span className="t-eyebrow">Step 4 · Recommended Agents</span>
              <h1 style={{ marginTop: 16 }}>
                Recommended AI agents for {businessName || 'your business'}.
              </h1>
              <p>
                Choose the primary agent you want to configure first. You can also
                check additional agents to provision in your workspace right away.
              </p>

              {(industry === 'healthcare' || industry === 'legal' || industry === 'finance') && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(0, 236, 151, 0.12)',
                    border: '1px dashed rgba(6, 51, 36, 0.28)',
                    fontSize: 13,
                    color: '#063324',
                    marginBottom: 16,
                  }}
                >
                  <strong>Regulated Industry Safeguards Enabled:</strong> Because you
                  selected{' '}
                  <strong>
                    {INDUSTRIES.find((i) => i.id === industry)?.label}
                  </strong>
                  , Tanat automatically adds strict clinical/compliance boundaries and
                  escalation rules to your agent instructions.
                </div>
              )}

              <div className="start-accordion" style={{ marginTop: 16 }}>
                {[
                  {
                    title: 'Recommended for you',
                    items: scoredTemplates.slice(0, 3),
                    isRecommended: true,
                  },
                  {
                    title: 'More agent blueprints',
                    items: scoredTemplates.slice(3),
                    isRecommended: false,
                  },
                ]
                  .filter((g) => g.items.length > 0)
                  .map((group) => {
                    const isOpen = openAgentGroups.includes(group.title);
                    const activeCount = group.items.filter(
                      (tpl) =>
                        tpl.id === primaryTemplateId ||
                        additionalTemplates.includes(tpl.id),
                    ).length;

                    return (
                      <div
                        key={group.title}
                        className={`start-accordion-item ${isOpen ? 'open' : ''}`}
                      >
                        <button
                          type="button"
                          className="start-accordion-trigger"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenAgentGroups((prev) =>
                              prev.includes(group.title)
                                ? prev.filter((g) => g !== group.title)
                                : [...prev, group.title],
                            )
                          }
                        >
                          <span className="start-accordion-title-wrap">
                            <span className="start-accordion-title">{group.title}</span>
                            <span className="start-accordion-meta">
                              {group.items.length} blueprints
                              {activeCount > 0 && (
                                <span className="start-accordion-count">
                                  {activeCount} selected
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="start-accordion-chevron" aria-hidden="true">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 6l4 4 4-4" />
                            </svg>
                          </span>
                        </button>

                        {isOpen && (
                          <div className="start-accordion-panel">
                            <div className="start-accordion-grid">
                              {group.items.map((tpl) => {
                                const isPrimary = primaryTemplateId === tpl.id;
                                const isAdditional = additionalTemplates.includes(tpl.id);
                                return (
                                  <div
                                    key={tpl.id}
                                    className={`start-agent-cell ${
                                      isPrimary ? 'primary' : isAdditional ? 'added' : ''
                                    }`}
                                  >
                                    <div className="start-agent-cell-head">
                                      <div className="start-agent-cell-title-row">
                                        <strong className="start-agent-cell-title">
                                          {tpl.name}
                                        </strong>
                                        {group.isRecommended && (
                                          <span className="start-agent-rec-pill">
                                            Recommended
                                          </span>
                                        )}
                                      </div>
                                      <span className="start-agent-cat">
                                        {tpl.category.toUpperCase()}
                                      </span>
                                    </div>

                                    <p className="start-agent-desc">{tpl.description}</p>

                                    <div className="start-agent-actions">
                                      <button
                                        type="button"
                                        className={`start-agent-btn ${
                                          isPrimary ? 'is-primary' : ''
                                        }`}
                                        onClick={() => selectPrimaryTemplate(tpl)}
                                      >
                                        {isPrimary
                                          ? '✓ Primary First Agent'
                                          : 'Set as Primary Agent'}
                                      </button>
                                      {!isPrimary && (
                                        <button
                                          type="button"
                                          className={`start-agent-btn ${
                                            isAdditional ? 'is-added' : ''
                                          }`}
                                          onClick={() =>
                                            setAdditionalTemplates((list) =>
                                              toggleItem(list, tpl.id),
                                            )
                                          }
                                        >
                                          {isAdditional
                                            ? '✓ Added to workspace'
                                            : '+ Also add'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  className="t-btn t-btn-ink"
                  type="button"
                  onClick={() => {
                    void persistDraft(4);
                    setStep(4);
                  }}
                >
                  Configure {agentName} <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 4: Configure First Agent ────────────────────────── */}
          {step === 4 && (
            <>
              <span className="t-eyebrow">Step 5 · Configure Agent</span>
              <h1 style={{ marginTop: 16 }}>Shape how {agentName} works.</h1>
              <p>Set identity, rules, and escalation in plain language.</p>

              <div className="start-row">
                <div className="start-field">
                  <label htmlFor="cfg-name">Agent name</label>
                  <input
                    id="cfg-name"
                    className="start-input"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>
                <div className="start-field">
                  <label htmlFor="cfg-tone">Tone</label>
                  <select
                    id="cfg-tone"
                    className="start-select"
                    value={tone}
                    onChange={(e) =>
                      setTone(
                        e.target.value as
                          | 'professional'
                          | 'friendly'
                          | 'concise'
                          | 'warm'
                          | 'formal'
                          | 'executive',
                      )
                    }
                  >
                    <option value="friendly">Friendly & helpful</option>
                    <option value="professional">Professional & clear</option>
                    <option value="concise">Concise & direct</option>
                    <option value="warm">Warm & empathetic</option>
                    <option value="formal">Formal & precise</option>
                    <option value="executive">Executive summary style</option>
                  </select>
                </div>
              </div>

              <div className="start-field">
                <label htmlFor="cfg-purpose">Purpose</label>
                <input
                  id="cfg-purpose"
                  className="start-input"
                  value={agentPurpose}
                  onChange={(e) => setAgentPurpose(e.target.value)}
                />
              </div>

              <div className="start-accordion" style={{ marginTop: 8 }}>
                <div
                  className={`start-accordion-item ${
                    openConfigSections.includes('Rules & escalation') ? 'open' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="start-accordion-trigger"
                    aria-expanded={openConfigSections.includes('Rules & escalation')}
                    onClick={() =>
                      setOpenConfigSections((prev) =>
                        prev.includes('Rules & escalation')
                          ? prev.filter((x) => x !== 'Rules & escalation')
                          : [...prev, 'Rules & escalation'],
                      )
                    }
                  >
                    <span className="start-accordion-title-wrap">
                      <span className="start-accordion-title">Rules & escalation</span>
                      <span className="start-accordion-meta">Responsibilities, boundaries</span>
                    </span>
                    <span className="start-accordion-chevron" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </span>
                  </button>
                  {openConfigSections.includes('Rules & escalation') && (
                    <div className="start-accordion-panel" style={{ padding: 16 }}>
                      <div className="start-row">
                        <div className="start-field">
                          <label htmlFor="cfg-resp">
                            Responsibilities <span className="hint">one/line</span>
                          </label>
                          <textarea
                            id="cfg-resp"
                            className="start-input"
                            rows={3}
                            style={{ height: 'auto', padding: '10px 12px' }}
                            value={responsibilitiesText}
                            onChange={(e) => setResponsibilitiesText(e.target.value)}
                          />
                        </div>
                        <div className="start-field">
                          <label htmlFor="cfg-never">
                            Must never do <span className="hint">guardrails</span>
                          </label>
                          <textarea
                            id="cfg-never"
                            className="start-input"
                            rows={3}
                            style={{ height: 'auto', padding: '10px 12px' }}
                            value={mustNotDoText}
                            onChange={(e) => setMustNotDoText(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="start-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="cfg-esc">Human escalation rule</label>
                        <input
                          id="cfg-esc"
                          className="start-input"
                          value={escalationRules}
                          onChange={(e) => setEscalationRules(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`start-accordion-item ${
                    openConfigSections.includes('Behavior preview') ? 'open' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="start-accordion-trigger"
                    aria-expanded={openConfigSections.includes('Behavior preview')}
                    onClick={() =>
                      setOpenConfigSections((prev) =>
                        prev.includes('Behavior preview')
                          ? prev.filter((x) => x !== 'Behavior preview')
                          : [...prev, 'Behavior preview'],
                      )
                    }
                  >
                    <span className="start-accordion-title-wrap">
                      <span className="start-accordion-title">Live behavior preview</span>
                      <span className="start-accordion-meta">{tone} tone</span>
                    </span>
                    <span className="start-accordion-chevron" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </span>
                  </button>
                  {openConfigSections.includes('Behavior preview') && (
                    <div className="start-accordion-panel">
                      <div className="start-preview-body">
                        <div className="t-bubble t-bubble-agent">
                          {welcomeMessage} I’m the {agentName} for{' '}
                          {businessName || 'your business'}.
                        </div>
                        <div className="t-bubble t-bubble-user">
                          Can you make an exception to your standard policy for me?
                        </div>
                        <div className="t-bubble t-bubble-agent">
                          I can share our verified policy details right away, and I’ll loop
                          in a human team member to review any policy exception for you.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(3)}>
                  ← Back
                </button>
                <button
                  className="t-btn t-btn-ink"
                  type="button"
                  onClick={() => {
                    void persistDraft(5);
                    setStep(5);
                  }}
                >
                  Add knowledge <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 5: Add Business Knowledge ───────────────────────── */}
          {step === 5 && (
            <>
              <span className="t-eyebrow">Step 6 · Knowledge</span>
              <h1 style={{ marginTop: 16 }}>
                Ground {agentName} in your info.
              </h1>
              <p>
                Add key policies or FAQs now — you can upload more anytime.
              </p>

              <div className="start-field">
                <label htmlFor="kn-title">Source title</label>
                <input
                  id="kn-title"
                  className="start-input"
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                />
              </div>

              <div className="start-field">
                <label htmlFor="kn-text">
                  Policies, pricing, or notes <span className="hint">recommended</span>
                </label>
                <textarea
                  id="kn-text"
                  className="start-input"
                  rows={3}
                  style={{ height: 'auto', padding: '12px 14px' }}
                  placeholder="Paste key facts about your services, hours, pricing, or SOPs..."
                  value={knowledgeText}
                  onChange={(e) => setKnowledgeText(e.target.value)}
                />
              </div>

              <div className="start-accordion" style={{ marginTop: 14 }}>
                <div className={`start-accordion-item ${openKnowledgeFaq ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="start-accordion-trigger"
                    aria-expanded={openKnowledgeFaq}
                    onClick={() => setOpenKnowledgeFaq((v) => !v)}
                  >
                    <span className="start-accordion-title-wrap">
                      <span className="start-accordion-title">
                        Frequently Asked Questions
                      </span>
                      <span className="start-accordion-meta">
                        <span className="start-accordion-count">{faqs.length} added</span>
                      </span>
                    </span>
                    <span className="start-accordion-chevron" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </span>
                  </button>

                  {openKnowledgeFaq && (
                    <div className="start-accordion-panel" style={{ padding: 16 }}>
                      {faqs.map((faq, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: '#faf8f6',
                            border: '1px dashed #d6d0c8',
                            marginBottom: 8,
                            fontSize: 12.5,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>Q: {faq.question}</div>
                          <div style={{ color: 'var(--muted)', marginTop: 2 }}>
                            A: {faq.answer}
                          </div>
                        </div>
                      ))}

                      <div className="start-row" style={{ marginTop: 10 }}>
                        <input
                          className="start-input"
                          placeholder="Question"
                          value={newFaqQ}
                          onChange={(e) => setNewFaqQ(e.target.value)}
                        />
                        <input
                          className="start-input"
                          placeholder="Answer"
                          value={newFaqA}
                          onChange={(e) => setNewFaqA(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="start-agent-btn"
                        style={{ marginTop: 10 }}
                        onClick={addFaq}
                      >
                        + Add FAQ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(4)}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="start-back"
                    type="button"
                    onClick={() => setStep(6)}
                  >
                    Skip
                  </button>
                  <button
                    className="t-btn t-btn-ink"
                    type="button"
                    onClick={() => {
                      void persistDraft(6);
                      setStep(6);
                    }}
                  >
                    Choose channels <ArrowIcon />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 6: Choose Where the Agent Should Work ───────────── */}
          {step === 6 && (
            <>
              <span className="t-eyebrow">Step 7 · Channels</span>
              <h1 style={{ marginTop: 16 }}>
                Where should {agentName} work?
              </h1>
              <p>
                Pick your launch channels. Add connectors anytime in your workspace.
              </p>

              <div className="start-accordion" style={{ marginTop: 16 }}>
                {[
                  {
                    title: 'Ready now',
                    items: CHANNEL_OPTIONS.filter((c) => c.badge === 'Available now'),
                  },
                  {
                    title: 'Messaging & app connectors',
                    items: CHANNEL_OPTIONS.filter((c) => c.badge !== 'Available now'),
                  },
                ].map((group) => {
                  const isOpen = openChannelGroups.includes(group.title);
                  const selectedInGroup = group.items.filter((c) =>
                    selectedChannels.includes(c.id),
                  ).length;
                  return (
                    <div
                      key={group.title}
                      className={`start-accordion-item ${isOpen ? 'open' : ''}`}
                    >
                      <button
                        type="button"
                        className="start-accordion-trigger"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenChannelGroups((prev) =>
                            prev.includes(group.title)
                              ? prev.filter((g) => g !== group.title)
                              : [...prev, group.title],
                          )
                        }
                      >
                        <span className="start-accordion-title-wrap">
                          <span className="start-accordion-title">{group.title}</span>
                          <span className="start-accordion-meta">
                            {group.items.length} channels
                            {selectedInGroup > 0 && (
                              <span className="start-accordion-count">
                                {selectedInGroup} selected
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="start-accordion-chevron" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        </span>
                      </button>

                      {isOpen && (
                        <div className="start-accordion-panel">
                          <div className="start-accordion-grid">
                            {group.items.map((ch) => {
                              const selected = selectedChannels.includes(ch.id);
                              return (
                                <button
                                  key={ch.id}
                                  type="button"
                                  className={`start-accordion-cell ${selected ? 'selected' : ''}`}
                                  onClick={() =>
                                    setSelectedChannels((list) =>
                                      toggleItem(list, ch.id),
                                    )
                                  }
                                >
                                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 11, minWidth: 0 }}>
                                    <span
                                      className="start-choice-icon"
                                      style={{
                                        background: '#ffffff',
                                        border: '1px solid var(--tn-border-strong)',
                                        color: 'var(--tn-ink)',
                                      }}
                                    >
                                      {CHANNEL_ICONS[ch.id] ?? '◎'}
                                    </span>
                                    <span className="start-accordion-cell-body">
                                      <span className="start-accordion-cell-title">
                                        {ch.title}
                                      </span>
                                      <span className="start-accordion-cell-note">
                                        {ch.note}
                                      </span>
                                    </span>
                                  </span>
                                  <span className="start-choice-check">
                                    <CheckIcon size={10} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedChannels.includes('website') && (
                <div className="start-field" style={{ marginTop: 16 }}>
                  <label htmlFor="ch-domains">
                    Allowed domains <span className="hint">comma-separated</span>
                  </label>
                  <input
                    id="ch-domains"
                    className="start-input"
                    placeholder="https://yourcompany.com, http://localhost:3000"
                    value={allowedDomainsText}
                    onChange={(e) => setAllowedDomainsText(e.target.value)}
                  />
                </div>
              )}

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(5)}>
                  ← Back
                </button>
                <button
                  className="t-btn t-btn-ink"
                  type="button"
                  disabled={selectedChannels.length === 0}
                  onClick={() => {
                    void persistDraft(7);
                    setStep(7);
                  }}
                >
                  Permissions <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 7: Permissions & Actions ────────────────────────── */}
          {step === 7 && (
            <>
              <span className="t-eyebrow">Step 8 · Governance</span>
              <h1 style={{ marginTop: 16 }}>
                Set boundaries for {agentName}.
              </h1>
              <p>
                Review what your agent can read, act on, or must escalate.
              </p>

              <div className="start-accordion" style={{ marginTop: 16 }}>
                {[
                  { title: 'Read-Only Permissions', items: readOnlyPerms },
                  { title: 'Allowed Actions', items: actionPerms },
                  { title: 'Human Approval Required', items: approvalPerms },
                  { title: 'Strictly Restricted', items: restrictedPerms },
                ].map((group) => {
                  const isOpen = openGovGroups.includes(group.title);
                  return (
                    <div
                      key={group.title}
                      className={`start-accordion-item ${isOpen ? 'open' : ''}`}
                    >
                      <button
                        type="button"
                        className="start-accordion-trigger"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenGovGroups((prev) =>
                            prev.includes(group.title)
                              ? prev.filter((g) => g !== group.title)
                              : [...prev, group.title],
                          )
                        }
                      >
                        <span className="start-accordion-title-wrap">
                          <span className="start-accordion-title">{group.title}</span>
                          <span className="start-accordion-meta">
                            <span className="start-accordion-count">
                              {group.items.length} rules
                            </span>
                          </span>
                        </span>
                        <span className="start-accordion-chevron" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        </span>
                      </button>
                      {isOpen && (
                        <div className="start-accordion-panel" style={{ padding: '14px 18px' }}>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: 18,
                              fontSize: 13,
                              lineHeight: 1.65,
                              color: '#525252',
                            }}
                          >
                            {group.items.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(6)}>
                  ← Back
                </button>
                <button
                  className="t-btn t-btn-ink"
                  type="button"
                  onClick={() => {
                    void persistDraft(8);
                    setStep(8);
                  }}
                >
                  Test live <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 8: Test Your Agent ──────────────────────────────── */}
          {step === 8 && (
            <>
              <span className="t-eyebrow">Step 9 · Live Sandbox</span>
              <h1 style={{ marginTop: 16 }}>Test {agentName}.</h1>
              <p>
                Send a message to verify tone, knowledge, and boundaries.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {[
                  'What do you do?',
                  'Support hours?',
                  'Policy exception?',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    className="start-agent-btn"
                    onClick={() => void handleTestMessage(sample)}
                    disabled={testBusy}
                  >
                    Ask: “{sample}”
                  </button>
                ))}
              </div>

              <div className="start-preview" style={{ marginTop: 8 }}>
                <div className="start-preview-top">
                  <span>Live Sandbox · {agentName}</span>
                  <span>Private Sandbox</span>
                </div>
                <div
                  className="start-preview-body"
                  style={{ minHeight: 160, maxHeight: 280, overflowY: 'auto' }}
                >
                  <div className="t-bubble t-bubble-agent">{welcomeMessage}</div>
                  {testMessages.map((m, idx) => (
                    <div key={idx}>
                      <div
                        className={`t-bubble ${
                          m.role === 'user' ? 't-bubble-user' : 't-bubble-agent'
                        }`}
                      >
                        <FormattedPreview content={m.content} />
                      </div>
                      {m.role === 'assistant' && (
                        <div
                          className="t-mono"
                          style={{
                            fontSize: 10,
                            color: 'var(--muted)',
                            marginTop: 4,
                            marginBottom: 8,
                          }}
                        >
                          {m.sources?.length
                            ? `Sources cited: ${m.sources.map((s) => s.title).join(', ')}`
                            : 'Grounded in business profile'}{' '}
                          {m.durationMs ? `· ${m.durationMs}ms` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                  {testBusy && (
                    <div className="t-bubble-typing">
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    padding: '8px 10px 0',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  {getSuggestedQuestions(testMessages).map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={testBusy}
                      onClick={() => void handleTestMessage(q)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 11.5,
                        cursor: testBusy ? 'not-allowed' : 'pointer',
                        color: 'inherit',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: 10,
                  }}
                >
                  <input
                    className="start-input"
                    placeholder="Type a test question for your agent..."
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleTestMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="t-btn t-btn-ink t-btn-sm"
                    onClick={() => void handleTestMessage()}
                    disabled={testBusy || !testInput.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>

              {error && <div className="start-error">{error}</div>}

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(7)}>
                  ← Back
                </button>
                <button
                  className="t-btn t-btn-ink"
                  type="button"
                  onClick={() => setStep(9)}
                >
                  Review & deploy <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 9: Deploy / Save Summary ────────────────────────── */}
          {step === 9 && (
            <>
              <span className="t-eyebrow">Step 10 · Review & Deploy</span>
              <h1 style={{ marginTop: 16 }}>Ready to deploy {agentName}.</h1>
              <p>
                Publishes your agent, stores knowledge, and generates your embed snippet.
              </p>

              <div className="start-summary-grid">
                <div className="start-summary-cell">
                  <strong>Workspace</strong>
                  <span>
                    {businessName || 'My Business'} ·{' '}
                    {INDUSTRIES.find((i) => i.id === industry)?.label}
                  </span>
                </div>
                <div className="start-summary-cell">
                  <strong>Primary Agent</strong>
                  <span>
                    {agentName} ({tone})
                    {additionalTemplates.length > 0 &&
                      ` + ${additionalTemplates.length} more`}
                  </span>
                </div>
                <div className="start-summary-cell">
                  <strong>Knowledge</strong>
                  <span>
                    {faqs.length} FAQ(s)
                    {knowledgeText.trim() ? ` + "${knowledgeTitle}"` : ''}
                    {websiteUrl.trim() ? ` + ${websiteUrl}` : ''}
                  </span>
                </div>
                <div className="start-summary-cell">
                  <strong>Channels</strong>
                  <span>{selectedChannels.join(', ')}</span>
                </div>
              </div>

              {error && <div className="start-error">{error}</div>}

              <div className="start-actions">
                <button className="start-back" type="button" onClick={() => setStep(8)}>
                  ← Back
                </button>
                <button
                  className="t-btn t-btn-lime"
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeploy()}
                >
                  {busy ? 'Deploying…' : 'Deploy agent'} <ArrowIcon />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 10: Enter Workspace (Deployed!) ─────────────────── */}
          {step === 10 && (
            <>
              <span className="t-eyebrow">Step 11 · Deployed</span>
              <h1 style={{ marginTop: 16 }}>
                {agentName} is live.
              </h1>
              <p>
                Copy the embed snippet or AI builder prompt, or open your dashboard.
              </p>

              <div className="start-snippet">
                {deployResult?.widget_snippet ??
                  `<script src="${PUBLIC_BASE_URL}/embed/tanat-widget.js" data-key="pk_live_..." data-agent="inst_..." defer></script>`}
              </div>

              <div className="start-summary-grid" style={{ marginTop: 16 }}>
                <div className="start-summary-cell">
                  <strong>Publishable Key</strong>
                  <code>{deployResult?.publishable_key ?? 'pk_live_...'}</code>
                </div>
                <div className="start-summary-cell">
                  <strong>Installation ID</strong>
                  <code>{deployResult?.installation_id ?? 'inst_...'}</code>
                </div>
                <div className="start-summary-cell">
                  <strong>Channels</strong>
                  <span>{selectedChannels.join(', ')}</span>
                </div>
                <div className="start-summary-cell">
                  <strong>Governance</strong>
                  <span>Human approval active</span>
                </div>
              </div>

              <div className="start-actions" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="start-back"
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        deployResult?.widget_snippet ?? '',
                      );
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 1600);
                    }}
                  >
                    {copiedSnippet ? 'Snippet copied ✓' : 'Copy HTML widget snippet'}
                  </button>
                  <button
                    className="start-back"
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(vibecoderPrompt);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 1600);
                    }}
                  >
                    {copiedPrompt
                      ? 'Prompt copied ✓'
                      : 'Copy prompt for Cursor / Lovable / v0'}
                  </button>
                </div>

                <button
                  className="t-btn t-btn-lime"
                  type="button"
                  onClick={() => router.push('/app')}
                >
                  Enter Workspace Dashboard <ArrowIcon />
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
