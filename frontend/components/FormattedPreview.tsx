'use client';

import React from 'react';

interface FormattedPreviewProps {
  content: string;
}

export function FormattedPreview({ content }: FormattedPreviewProps) {
  if (!content.trim()) {
    return (
      <div className="muted" style={{ padding: 16, fontStyle: 'italic', fontSize: 13 }}>
        Nothing to preview yet. Paste or type your knowledge content or upload a document to see formatting rendered live.
      </div>
    );
  }

  // Parse lines into blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} style={{ margin: '8px 0 8px 20px', paddingLeft: 0 }}>
            {currentList.items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ul>,
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} style={{ margin: '8px 0 8px 20px', paddingLeft: 0 }}>
            {currentList.items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ol>,
        );
      }
      currentList = null;
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      flushList();
      elements.push(<div key={`empty-${idx}`} style={{ height: 8 }} />);
      return;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h1-${idx}`} style={{ fontSize: 18, fontWeight: 700, margin: '14px 0 6px 0', color: 'var(--text-primary)' }}>
          {renderInlineFormatting(line.slice(2))}
        </h2>,
      );
      return;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h2-${idx}`} style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 5px 0', color: 'var(--text-primary)' }}>
          {renderInlineFormatting(line.slice(3))}
        </h3>,
      );
      return;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h3-${idx}`} style={{ fontSize: 14, fontWeight: 600, margin: '10px 0 4px 0', color: 'var(--text-primary)' }}>
          {renderInlineFormatting(line.slice(4))}
        </h4>,
      );
      return;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${idx}`}
          style={{
            margin: '8px 0',
            padding: '6px 12px',
            borderLeft: '3px solid var(--accent)',
            background: 'rgba(59, 130, 246, 0.05)',
            fontStyle: 'italic',
            borderRadius: '0 4px 4px 0',
          }}
        >
          {renderInlineFormatting(line.slice(2))}
        </blockquote>,
      );
      return;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const itemText = line.replace(/^[-*•]\s+/, '');
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: 'ul', items: [itemText] };
      }
      return;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const itemText = numMatch[2];
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: 'ol', items: [itemText] };
      }
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} style={{ margin: '4px 0', lineHeight: 1.55 }}>
        {renderInlineFormatting(rawLine)}
      </p>,
    );
  });

  flushList();

  return (
    <div className="kn-rendered-content" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
      {elements}
    </div>
  );
}

/**
 * Safely parse inline markdown:
 * - **bold**
 * - *italic*
 * - <u>underline</u>
 * - ~~strikethrough~~
 * - `code`
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Replace tokens with a custom parser
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Regex to match inline tokens: **bold**, *italic*, <u>underline</u>, ~~strike~~, `code`
  const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|<u>(.*?)<\/u>|~~(.*?)~~|`([^`]+)`)/;

  while (remaining.length > 0) {
    const match = remaining.match(regex);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      parts.push(<strong key={keyIndex++}>{match[2]}</strong>);
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      parts.push(<em key={keyIndex++}>{match[3]}</em>);
    } else if (fullMatch.startsWith('<u>') && fullMatch.endsWith('</u>')) {
      parts.push(<u key={keyIndex++}>{match[4]}</u>);
    } else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~')) {
      parts.push(<del key={keyIndex++}>{match[5]}</del>);
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      parts.push(
        <code
          key={keyIndex++}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {match[6]}
        </code>,
      );
    } else {
      parts.push(fullMatch);
    }

    remaining = remaining.slice(match.index + fullMatch.length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

