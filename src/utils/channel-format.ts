/**
 * Channel-specific message formatters so agent replies render cleanly
 * without raw markdown asterisks (**bold**) on Telegram, WhatsApp, and Slack.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeSpacing(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Formats markdown-ish LLM output into clean Telegram HTML (`parse_mode: 'HTML'`).
 */
export function formatForTelegramHtml(raw: string): string {
  const codeBlocks: string[] = [];
  let text = raw.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_m, code: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre>${escapeHtml(code.trim())}</pre>`);
    return `__CODE_BLOCK_${idx}__`;
  });

  const inlineCodes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `__INLINE_CODE_${idx}__`;
  });

  text = escapeHtml(text);

  // Headings -> bold section titles
  text = text.replace(/^#{1,6}\s+(.+)$/gm, (_m, heading: string) => `<b>${heading.trim()}</b>`);

  // Bullet lists (- or * at start of line) -> clean bullet dot
  text = text.replace(/^\s*[-*•]\s+/gm, '• ');

  // Bold (**text** or __text__)
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  text = text.replace(/__([^_\n]+)__/g, '<b>$1</b>');

  // Italic (*text* or _text_)
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/gm, '$1<i>$2</i>');
  text = text.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/gm, '$1<i>$2</i>');

  // Markdown links [label](url) -> <a href="url">label</a>
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  // Restore code blocks and inline code
  text = text.replace(/__INLINE_CODE_(\d+)__/g, (_m, i: string) => inlineCodes[Number(i)] ?? '');
  text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_m, i: string) => codeBlocks[Number(i)] ?? '');

  return normalizeSpacing(text);
}

/**
 * Plain-text fallback if Telegram rejects HTML entities or malformed tags.
 */
export function stripMarkdownForPlainText(raw: string): string {
  return normalizeSpacing(
    raw
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')
      .replace(/__([^_\n]+)__/g, '$1')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/gm, '$1$2')
      .replace(/`([^`\n]+)`/g, '$1'),
  );
}

/**
 * Formats markdown-ish LLM output into clean Slack mrkdwn / WhatsApp syntax
 * (*bold*, _italic_, • bullets, zero raw **double asterisks**).
 */
export function formatForMrkdwn(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n');

  // Headings -> *Heading*
  text = text.replace(/^#{1,6}\s+(.+)$/gm, (_m, heading: string) => `*${heading.trim()}*`);

  // Bullet lists (- or * at start of line) -> clean bullet dot
  text = text.replace(/^\s*[-*]\s+/gm, '• ');

  // Convert **bold** and __bold__ to single *bold*
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '*$1*');
  text = text.replace(/__([^_\n]+)__/g, '*$1*');

  // Clean up any stray double asterisks
  text = text.replace(/\*\*/g, '*');

  return normalizeSpacing(text);
}

