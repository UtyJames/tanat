'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  createSession,
  getSession,
  listInstallations,
  listSessions,
  sendMessage,
} from '@/lib/api';
import type {
  ChatMessage,
  Installation,
  Message,
  ProposedAction,
  Session,
} from '@/lib/types';
import ActionCard from './ActionCard';

interface Props {
  tenantName: string;
  onActionsChanged?: () => void;
}

function parseProposedAction(raw: string | null): ProposedAction | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.status === 'string') {
      return parsed as ProposedAction;
    }
  } catch {
    // Not every tool payload is a proposed action.
  }
  return undefined;
}

function toChatMessage(message: Message): ChatMessage {
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : message.role === 'system' ? 'system' : 'assistant',
    content: message.content,
    proposedAction: parseProposedAction(message.tool_calls),
  };
}

export default function Chat({ tenantName, onActionsChanged }: Props) {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [installationId, setInstallationId] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Load installations once.
  useEffect(() => {
    let cancelled = false;

    listInstallations()
      .then((list) => {
        if (cancelled) return;
        setInstallations(list);
        if (list.length > 0) setInstallationId(list[0].id);
        else setError('No agent is installed for this tenant yet.');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load installations.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load sessions when the installation changes.
  useEffect(() => {
    if (!installationId) {
      setSessions([]);
      setSessionId('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    listSessions(installationId)
      .then((list) => {
        if (cancelled) return;
        setSessions(list);
        setSessionId(list.length > 0 ? list[0].id : '');
        if (list.length === 0) setMessages([]);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load sessions.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [installationId]);

  // Load messages when the session changes.
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    getSession(sessionId)
      .then((session) => {
        if (cancelled) return;
        setMessages((session.messages ?? []).map(toChatMessage));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load messages.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleNewSession = useCallback(async () => {
    if (!installationId) return;
    setError(null);
    try {
      const session = await createSession({ installation_id: installationId });
      setSessions((previous) => [session, ...previous]);
      setSessionId(session.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create a session.');
    }
  }, [installationId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    let activeSessionId = sessionId;

    try {
      if (!activeSessionId) {
        if (!installationId) throw new ApiError('No installation selected.', 0);
        const session = await createSession({ installation_id: installationId });
        activeSessionId = session.id;
        setSessions((previous) => [session, ...previous]);
        setSessionId(session.id);
      }

      const optimistic: ChatMessage = {
        id: `local_${Date.now()}`,
        role: 'user',
        content: text,
      };
      setMessages((previous) => [...previous, optimistic]);
      setInput('');

      const reply = await sendMessage(activeSessionId, text);
      setMessages((previous) => [
        ...previous,
        {
          id: reply.id,
          role: 'assistant',
          content: reply.content,
          proposedAction: reply.proposed_action ?? undefined,
        },
      ]);

      if (reply.proposed_action) onActionsChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the message.');
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId, installationId, onActionsChanged]);

  const activeInstallation = installations.find(
    (installation) => installation.id === installationId,
  );

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <button
          className="btn btn-primary btn-sm sidebar-new"
          onClick={() => void handleNewSession()}
          disabled={!installationId}
        >
          + New session
        </button>

        {loading ? (
          <div className="sidebar-loading">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="sidebar-empty">No sessions yet</div>
        ) : (
          <ul className="session-list">
            {sessions.map((session) => (
              <li
                key={session.id}
                className={`session-item ${session.id === sessionId ? 'active' : ''}`}
                onClick={() => setSessionId(session.id)}
              >
                <span className="session-title">
                  {session.agent_name ?? 'Session'}
                </span>
                <span className="session-date">
                  {new Date(session.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="chat-main">
        <div className="chat-toolbar">
          <label htmlFor="installation">Agent</label>
          <select
            id="installation"
            className="install-select"
            value={installationId}
            onChange={(event) => setInstallationId(event.target.value)}
          >
            {installations.length === 0 && <option value="">No installations</option>}
            {installations.map((installation) => (
              <option key={installation.id} value={installation.id}>
                {installation.agent_name ?? installation.agent_id}
              </option>
            ))}
          </select>
          <span className="muted">
            {activeInstallation?.agent_slug ?? ''} · {tenantName}
          </span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="messages-scroll">
          {messages.length === 0 && !sending && (
            <div className="chat-empty">
              <div className="chat-empty-icon">◈</div>
              <h3>Start a conversation</h3>
              <p>
                Ask the agent to help a customer. Money requests are proposed as
                actions and must be approved before anything moves.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`message message-${message.role}`}>
              <div className="message-bubble">
                <p>{message.content}</p>
                {message.proposedAction && (
                  <ActionCard
                    action={message.proposedAction}
                    onChanged={onActionsChanged}
                  />
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="message message-assistant">
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          className="chat-input-bar"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
        >
          <input
            className="chat-input"
            type="text"
            placeholder="Ask the agent…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={sending || !installationId}
            autoFocus
          />
          <button
            className="btn btn-primary chat-send"
            type="submit"
            disabled={sending || !input.trim() || !installationId}
          >
            Send ↗
          </button>
        </form>
      </div>
    </div>
  );
}
