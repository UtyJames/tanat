/**
 * Tanat — Embeddable Website Agent Widget (`tanat-widget.js`)
 *
 * Zero-dependency, Shadow-DOM isolated widget.
 * Usage:
 *   <script
 *     src="https://your-tanat-host/embed/tanat-widget.js"
 *     data-key="pk_..."
 *     data-agent="inst_..."
 *     data-api="http://localhost:8787"
 *     data-theme="dark"
 *     data-accent="#C9F26B"
 *     data-position="bottom-right"
 *     defer
 *   ></script>
 */
(function () {
  if (typeof window === 'undefined' || window.__tanatWidgetLoaded) return;
  window.__tanatWidgetLoaded = true;

  function findScript() {
    return (
      document.currentScript ||
      document.querySelector('script[data-key][src*="tanat-widget"]') ||
      document.querySelector('script[data-key]')
    );
  }

  function getVisitorId() {
    var storageKey = 'tanat_visitor_id';
    try {
      var existing = window.localStorage.getItem(storageKey);
      if (existing) return existing;
      var created =
        'vis_' +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);
      window.localStorage.setItem(storageKey, created);
      return created;
    } catch (_e) {
      return 'vis_anon_' + Math.random().toString(36).slice(2, 10);
    }
  }

  function inferApiBase(scriptEl) {
    var explicit = scriptEl && scriptEl.getAttribute('data-api');
    if (explicit) return explicit.replace(/\/$/, '');
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8787';
    }
    return 'https://api.tanat.space';
  }

  function mountWidget(options) {
    var pubKey = (options.key || '').trim();
    if (!pubKey) {
      console.warn('[Tanat Widget] Missing data-key (publishable key pk_...).');
      return;
    }

    var apiBase = (
      options.apiBase ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8787'
        : 'https://api.tanat.space')
    ).replace(/\/$/, '');
    var publicUrl = apiBase + '/api/public/v1';
    var theme = options.theme === 'light' ? 'light' : 'dark';
    var accent = options.accent || '#C9F26B';
    var position = options.position === 'bottom-left' ? 'left' : 'right';
    var customGreeting = options.welcome || '';
    var userId = options.userId || undefined;
    var userSignature = options.userSignature || undefined;
    var visitorId = getVisitorId();

    var host = document.createElement('div');
    host.id = 'tanat-widget-root';
    document.body.appendChild(host);
    var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var isLight = theme === 'light';
    var bgSurface = isLight ? '#F8F6F0' : '#0E100E';
    var bgCard = isLight ? '#FFFFFF' : '#161916';
    var fgText = isLight ? '#0C0D0B' : '#F4F2EC';
    var fgMuted = isLight ? '#5F645B' : '#969B90';
    var borderCol = isLight ? 'rgba(12,13,11,0.12)' : 'rgba(244,242,236,0.12)';

    var style = document.createElement('style');
    style.textContent = [
      ':host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; }',
      '.tw-wrap { position: fixed; bottom: 20px; ' + position + ': 20px; z-index: 2147483000; display: flex; flex-direction: column; align-items: ' + (position === 'left' ? 'flex-start' : 'flex-end') + '; }',
      '.tw-launcher { width: 56px; height: 56px; border-radius: 16px; border: 1px solid ' + borderCol + '; background: #0C0D0B; color: ' + accent + '; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 34px rgba(0,0,0,0.28); transition: transform 0.18s ease, box-shadow 0.18s ease; }',
      '.tw-launcher:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(0,0,0,0.34); }',
      '.tw-panel { width: 380px; max-width: calc(100vw - 32px); height: 540px; max-height: calc(100vh - 104px); margin-bottom: 12px; border-radius: 18px; overflow: hidden; display: none; flex-direction: column; background: ' + bgSurface + '; color: ' + fgText + '; border: 1px solid ' + borderCol + '; box-shadow: 0 24px 60px rgba(0,0,0,0.32); }',
      '.tw-panel.open { display: flex; }',
      '.tw-head { padding: 16px 18px; background: #0C0D0B; color: #F6F3EA; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); }',
      '.tw-head-info { display: flex; flex-direction: column; gap: 2px; }',
      '.tw-agent-name { font-size: 15px; font-weight: 650; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }',
      '.tw-dot { width: 8px; height: 8px; border-radius: 50%; background: ' + accent + '; display: inline-block; }',
      '.tw-biz-name { font-size: 12px; color: #9EA398; }',
      '.tw-close { background: transparent; border: none; color: #9EA398; cursor: pointer; font-size: 18px; line-height: 1; padding: 4px 8px; border-radius: 8px; }',
      '.tw-close:hover { color: #FFFFFF; background: rgba(255,255,255,0.08); }',
      '.tw-msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }',
      '.tw-msg { max-width: 85%; padding: 11px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; word-wrap: break-word; }',
      '.tw-msg p { margin: 0 0 6px 0; }',
      '.tw-msg p:last-child { margin-bottom: 0; }',
      '.tw-msg ul, .tw-msg ol { margin: 6px 0 6px 18px; padding: 0; }',
      '.tw-msg li { margin-bottom: 4px; }',
      '.tw-msg code { font-family: monospace; font-size: 12px; padding: 1px 4px; border-radius: 4px; background: rgba(128,128,128,0.16); }',
      '.tw-msg-assistant { align-self: flex-start; background: ' + bgCard + '; color: ' + fgText + '; border: 1px solid ' + borderCol + '; border-bottom-left-radius: 4px; }',
      '.tw-msg-user { align-self: flex-end; background: #0C0D0B; color: #F6F3EA; border-bottom-right-radius: 4px; }',
      '.tw-sources { margin-top: 6px; font-size: 11px; color: ' + fgMuted + '; display: flex; flex-wrap: wrap; gap: 4px; }',
      '.tw-source-tag { padding: 2px 6px; border-radius: 6px; background: rgba(201,242,107,0.14); font-family: monospace; font-size: 10.5px; }',
      '.tw-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px 4px; background: ' + bgCard + '; border-top: 1px solid ' + borderCol + '; }',
      '.tw-suggestion-chip { border: 1px solid ' + borderCol + '; background: ' + bgSurface + '; color: ' + fgText + '; border-radius: 999px; padding: 4px 10px; font-size: 11.5px; cursor: pointer; text-align: left; transition: border-color 0.15s ease; }',
      '.tw-suggestion-chip:hover:not(:disabled) { border-color: ' + accent + '; }',
      '.tw-suggestion-chip:disabled { opacity: 0.45; cursor: default; }',
      '.tw-form { display: flex; gap: 8px; padding: 10px 14px 12px; background: ' + bgCard + '; }',
      '.tw-input { flex: 1; border: 1px solid ' + borderCol + '; background: ' + bgSurface + '; color: ' + fgText + '; border-radius: 10px; padding: 10px 12px; font-size: 13.5px; outline: none; }',
      '.tw-send { border: none; border-radius: 10px; padding: 0 15px; background: ' + accent + '; color: #0C0D0B; font-weight: 650; font-size: 13px; cursor: pointer; }',
      '.tw-send:disabled { opacity: 0.5; cursor: default; }',
      '.tw-foot { padding: 6px 14px 8px; text-align: center; font-size: 11px; color: ' + fgMuted + '; background: ' + bgCard + '; }',
    ].join('\n');

    var wrap = document.createElement('div');
    wrap.className = 'tw-wrap';
    wrap.innerHTML = [
      '<div class="tw-panel" role="dialog" aria-label="AI Assistant">',
      '  <div class="tw-head">',
      '    <div class="tw-head-info">',
      '      <div class="tw-agent-name"><span class="tw-dot"></span><span id="tw-agent-title">AI Assistant</span></div>',
      '      <div class="tw-biz-name" id="tw-biz-title">Powered by Tanat</div>',
      '    </div>',
      '    <button class="tw-close" id="tw-close-btn" aria-label="Close">×</button>',
      '  </div>',
      '  <div class="tw-msgs" id="tw-msgs"></div>',
      '  <div class="tw-suggestions" id="tw-suggestions"></div>',
      '  <form class="tw-form" id="tw-form">',
      '    <input class="tw-input" id="tw-input" type="text" placeholder="Write a message…" autocomplete="off" />',
      '    <button class="tw-send" id="tw-send" type="submit">Send</button>',
      '  </form>',
      '  <div class="tw-foot">Secured by Tanat AI Infrastructure</div>',
      '</div>',
      '<button class="tw-launcher" id="tw-launcher" aria-label="Open chat">',
      '  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">',
      '    <path d="M5 7.5C5 6.12 6.12 5 7.5 5h13C21.88 5 23 6.12 23 7.5v9c0 1.38-1.12 2.5-2.5 2.5H13l-4.5 4v-4H7.5C6.12 19 5 17.88 5 16.5v-9Z" stroke="currentColor" stroke-width="2"/>',
      '    <path d="M10.5 12.2 13 14.7 17.8 9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      '  </svg>',
      '</button>',
    ].join('');

    shadow.appendChild(style);
    shadow.appendChild(wrap);

    var panel = wrap.querySelector('.tw-panel');
    var launcher = wrap.querySelector('#tw-launcher');
    var closeBtn = wrap.querySelector('#tw-close-btn');
    var msgsEl = wrap.querySelector('#tw-msgs');
    var suggestionsEl = wrap.querySelector('#tw-suggestions');
    var formEl = wrap.querySelector('#tw-form');
    var inputEl = wrap.querySelector('#tw-input');
    var sendBtn = wrap.querySelector('#tw-send');
    var agentTitleEl = wrap.querySelector('#tw-agent-title');
    var bizTitleEl = wrap.querySelector('#tw-biz-title');

    var sessionId = null;
    var bootstrapped = false;
    var busy = false;
    var askedSet = {};

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function formatInline(escaped) {
      return escaped
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    function formatMessageHtml(text) {
      var normalized = String(text || '')
        .replace(/:\s+-\s+(?=\*\*)/g, ':\n- ')
        .replace(/\s+-\s+(?=\*\*)/g, '\n- ');
      var lines = normalized.split('\n');
      var html = [];
      var listType = null;

      function closeList() {
        if (listType) {
          html.push('</' + listType + '>');
          listType = null;
        }
      }

      for (var i = 0; i < lines.length; i++) {
        var raw = lines[i].trim();
        if (!raw) {
          closeList();
          continue;
        }
        var bulletMatch = raw.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
          if (listType !== 'ul') {
            closeList();
            listType = 'ul';
            html.push('<ul>');
          }
          html.push('<li>' + formatInline(escapeHtml(bulletMatch[1])) + '</li>');
          continue;
        }
        var numMatch = raw.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          if (listType !== 'ol') {
            closeList();
            listType = 'ol';
            html.push('<ol>');
          }
          html.push('<li>' + formatInline(escapeHtml(numMatch[2])) + '</li>');
          continue;
        }
        closeList();
        html.push('<p>' + formatInline(escapeHtml(raw)) + '</p>');
      }
      closeList();
      return html.join('');
    }

    function renderSuggestions(lastText) {
      if (!suggestionsEl) return;
      var lower = String(lastText || '').toLowerCase();
      var candidates = [];
      if (lower.indexOf('product') !== -1 || lower.indexOf('pricing') !== -1 || lower.indexOf('laptop') !== -1) {
        candidates.push('What products and pricing tiers do you offer?');
      }
      if (lower.indexOf('order') !== -1 || lower.indexOf('payment') !== -1) {
        candidates.push('How do orders and payments work?');
      }
      if (lower.indexOf('shipping') !== -1 || lower.indexOf('delivery') !== -1 || lower.indexOf('track') !== -1) {
        candidates.push('What are your shipping timelines?');
      }
      if (lower.indexOf('return') !== -1 || lower.indexOf('refund') !== -1) {
        candidates.push('How do I request a return or refund?');
      }
      if (lower.indexOf('support') !== -1 || lower.indexOf('repair') !== -1 || lower.indexOf('troubleshoot') !== -1) {
        candidates.push('How do I get technical support?');
      }
      candidates.push(
        'What can you help me with?',
        'What products or services do you offer?',
        'What is your return & refund policy?',
        'How do I track my order?'
      );

      var shown = [];
      for (var i = 0; i < candidates.length && shown.length < 3; i++) {
        var q = candidates[i];
        if (!askedSet[q.toLowerCase()] && shown.indexOf(q) === -1) {
          shown.push(q);
        }
      }

      suggestionsEl.innerHTML = '';
      shown.forEach(function (q) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tw-suggestion-chip';
        btn.textContent = q;
        btn.disabled = busy;
        btn.addEventListener('click', function () {
          sendUserText(q);
        });
        suggestionsEl.appendChild(btn);
      });
    }

    function setSuggestionsDisabled(disabled) {
      if (!suggestionsEl) return;
      var btns = suggestionsEl.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        btns[i].disabled = disabled;
      }
    }

    function addBubble(role, text, sources) {
      var div = document.createElement('div');
      div.className = 'tw-msg tw-msg-' + role;
      if (text === '…') {
        div.textContent = '…';
      } else {
        div.innerHTML = formatMessageHtml(text);
      }
      if (Array.isArray(sources) && sources.length > 0) {
        var srcWrap = document.createElement('div');
        srcWrap.className = 'tw-sources';
        sources.forEach(function (s) {
          var tag = document.createElement('span');
          tag.className = 'tw-source-tag';
          tag.textContent = s.label || 'Source';
          srcWrap.appendChild(tag);
        });
        div.appendChild(srcWrap);
      }
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return div;
    }

    function bootstrap() {
      if (bootstrapped) return;
      bootstrapped = true;
      fetch(publicUrl + '/config', {
        headers: { 'X-Tanat-Key': pubKey },
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.data) {
            if (res.data.agent && res.data.agent.name) {
              agentTitleEl.textContent = res.data.agent.name;
            }
            if (res.data.business && res.data.business.name) {
              bizTitleEl.textContent = res.data.business.name;
            }
            var greeting =
              customGreeting ||
              (res.data.agent && res.data.agent.greeting) ||
              'Hello! How can I help you today?';
            addBubble('assistant', greeting);
            renderSuggestions(greeting);
          } else {
            var fallback = customGreeting || 'Hello! How can I help you today?';
            addBubble('assistant', fallback);
            renderSuggestions(fallback);
          }
        })
        .catch(function () {
          var fallback = customGreeting || 'Hello! How can I help you today?';
          addBubble('assistant', fallback);
          renderSuggestions(fallback);
        });
    }

    function ensureSession() {
      if (sessionId) return Promise.resolve(sessionId);
      var payload = {};
      if (userId) payload.user_id = userId;
      if (userSignature) payload.user_signature = userSignature;

      return fetch(publicUrl + '/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tanat-Key': pubKey,
          'X-Tanat-Visitor': visitorId,
        },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.data && res.data.session_id) {
            sessionId = res.data.session_id;
            return sessionId;
          }
          throw new Error((res && res.error && res.error.message) || 'Could not start session');
        });
    }

    launcher.addEventListener('click', function () {
      var isOpen = panel.classList.toggle('open');
      if (isOpen) {
        bootstrap();
        setTimeout(function () { inputEl.focus(); }, 60);
      }
    });

    closeBtn.addEventListener('click', function () {
      panel.classList.remove('open');
    });

    function sendUserText(rawText) {
      var text = (rawText || '').trim();
      if (!text || busy) return;
      askedSet[text.toLowerCase()] = true;
      addBubble('user', text);
      busy = true;
      sendBtn.disabled = true;
      setSuggestionsDisabled(true);
      var thinking = addBubble('assistant', '…');

      ensureSession()
        .then(function (sid) {
          return fetch(publicUrl + '/sessions/' + encodeURIComponent(sid) + '/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tanat-Key': pubKey,
              'X-Tanat-Visitor': visitorId,
            },
            body: JSON.stringify({ content: text }),
          });
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          msgsEl.removeChild(thinking);
          if (res && res.data && res.data.content) {
            addBubble('assistant', res.data.content, res.data.sources_used);
            renderSuggestions(res.data.content);
          } else {
            addBubble(
              'assistant',
              (res && res.error && res.error.message) ||
                'I could not process that request right now.',
            );
          }
        })
        .catch(function (err) {
          msgsEl.removeChild(thinking);
          addBubble('assistant', err.message || 'Connection error. Please try again.');
        })
        .finally(function () {
          busy = false;
          sendBtn.disabled = false;
          setSuggestionsDisabled(false);
          inputEl.focus();
        });
    }

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (inputEl.value || '').trim();
      if (!text || busy) return;
      inputEl.value = '';
      sendUserText(text);
    });

    window.TanatWidget = {
      open: function () {
        panel.classList.add('open');
        bootstrap();
      },
      close: function () {
        panel.classList.remove('open');
      },
    };
  }

  var script = findScript();
  if (script && script.getAttribute('data-key')) {
    var init = function () {
      mountWidget({
        key: script.getAttribute('data-key'),
        agent: script.getAttribute('data-agent'),
        apiBase: inferApiBase(script),
        theme: script.getAttribute('data-theme') || 'dark',
        accent: script.getAttribute('data-accent') || '#C9F26B',
        position: script.getAttribute('data-position') || 'bottom-right',
        welcome: script.getAttribute('data-welcome') || '',
        userId: script.getAttribute('data-user-id') || '',
        userSignature: script.getAttribute('data-user-signature') || '',
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } else {
    window.TanatWidget = { init: mountWidget };
  }
})();

