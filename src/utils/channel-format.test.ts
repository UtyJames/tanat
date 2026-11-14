import { describe, expect, it } from 'vitest';
import {
  formatForMrkdwn,
  formatForTelegramHtml,
  stripMarkdownForPlainText,
} from './channel-format';

const SAMPLE_REPLY = `Great choice! 😊 The **NovaBook Pro 14** is a solid machine:

💻 **NovaBook Pro 14** – ₦1,250,000
- Intel Core i7
- 16GB RAM
- 512GB SSD

**To order:**
1. Visit **www.novatech.example**
2. Add the NovaBook Pro 14 to your cart

⚠️ *Availability and final pricing should be confirmed before your order is accepted.*`;

describe('channel-format', () => {
  it('formats markdown cleanly into Telegram HTML with zero raw asterisks', () => {
    const html = formatForTelegramHtml(SAMPLE_REPLY);
    expect(html).not.toContain('**');
    expect(html).toContain('<b>NovaBook Pro 14</b>');
    expect(html).toContain('• Intel Core i7');
    expect(html).toContain('<i>Availability and final pricing should be confirmed before your order is accepted.</i>');
  });

  it('formats markdown cleanly into Slack/WhatsApp mrkdwn with single-asterisk bold and dot bullets', () => {
    const mrkdwn = formatForMrkdwn(SAMPLE_REPLY);
    expect(mrkdwn).not.toContain('**');
    expect(mrkdwn).toContain('*NovaBook Pro 14*');
    expect(mrkdwn).toContain('• Intel Core i7');
  });

  it('strips markdown cleanly for plain-text fallback', () => {
    const plain = stripMarkdownForPlainText(SAMPLE_REPLY);
    expect(plain).not.toContain('**');
    expect(plain).toContain('• Intel Core i7');
  });
});

