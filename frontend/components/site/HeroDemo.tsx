'use client';

import { CheckIcon } from '@/components/brand/Logo';

const agents = [
  { name: 'Customer Support', job: 'Answers questions · escalates', state: 'Published' },
  { name: 'Bookings', job: 'Collects requests · confirms', state: 'Testing' },
  { name: 'HR Assistant', job: 'Internal policy answers', state: 'Draft' },
];

const channels = ['Website', 'WhatsApp', 'Slack', 'Telegram', 'API'];

export default function WorkspacePreview() {
  return (
    <div className="t-map" aria-label="Tanat workspace preview">
      <div className="t-map-top">
        <span className="t-map-workspace">
          <span className="t-map-mark" aria-hidden="true" />
          Acme Workspace
        </span>
        <span className="t-mono">3 agents</span>
      </div>

      <div className="t-map-body">
        <div className="t-map-agents">
          <span className="t-map-label">Agents</span>
          {agents.map((agent) => (
            <div className="t-map-agent" key={agent.name}>
              <span className="t-map-agent-name">{agent.name}</span>
              <span className="t-map-agent-job">{agent.job}</span>
              <span className={`t-map-state ${agent.state.toLowerCase()}`}>
                {agent.state}
              </span>
            </div>
          ))}
        </div>

        <div className="t-map-link" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <div className="t-map-side">
          <span className="t-map-label">Channels</span>
          <div className="t-map-chips">
            {channels.map((channel) => (
              <span className="t-map-chip" key={channel}>
                {channel}
              </span>
            ))}
          </div>

          <span className="t-map-label" style={{ marginTop: 18 }}>
            Knowledge & tools
          </span>
          <div className="t-map-chips">
            <span className="t-map-chip muted">Website import</span>
            <span className="t-map-chip muted">Policies</span>
            <span className="t-map-chip muted">Booking system</span>
          </div>

          <div className="t-map-note">
            <span className="t-map-check">
              <CheckIcon size={9} />
            </span>
            Sensitive actions need a human.
          </div>
        </div>
      </div>

      <div className="t-map-foot">
        <span>One workspace</span>
        <span>Many agents</span>
        <span>Every channel</span>
      </div>
    </div>
  );
}
