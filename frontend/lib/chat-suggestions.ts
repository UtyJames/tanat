/**
 * Suggestive follow-up questions for Tanat conversation UIs.
 */

const STARTER_SUGGESTIONS = [
  'What can you help me with?',
  'What products or services do you offer?',
  'What is your return & refund policy?',
  'How do I track my order?',
];

export function getSuggestedQuestions(
  messages: Array<{ role: string; content: string }>,
): string[] {
  const recentUserTexts = new Set(
    messages
      .filter((m) => m.role === 'user')
      .slice(-6)
      .map((m) => m.content.trim().toLowerCase()),
  );

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant')?.content.toLowerCase();

  const candidates: string[] = [];

  if (!lastAssistant) {
    candidates.push(...STARTER_SUGGESTIONS);
  } else {
    if (lastAssistant.includes('product') || lastAssistant.includes('pricing') || lastAssistant.includes('laptop')) {
      candidates.push('What products and pricing tiers do you offer?');
    }
    if (lastAssistant.includes('order') || lastAssistant.includes('payment')) {
      candidates.push('How do orders and payments work?');
    }
    if (lastAssistant.includes('shipping') || lastAssistant.includes('delivery') || lastAssistant.includes('track')) {
      candidates.push('What are your shipping and delivery timelines?');
    }
    if (lastAssistant.includes('return') || lastAssistant.includes('refund')) {
      candidates.push('How do I request a return or refund?');
    }
    if (lastAssistant.includes('support') || lastAssistant.includes('repair') || lastAssistant.includes('troubleshoot')) {
      candidates.push('How do I get technical support or repairs?');
    }
    if (lastAssistant.includes('appointment') || lastAssistant.includes('book') || lastAssistant.includes('schedule')) {
      candidates.push('How can I book or reschedule an appointment?');
    }
    candidates.push(...STARTER_SUGGESTIONS);
  }

  const unique: string[] = [];
  for (const q of candidates) {
    if (recentUserTexts.has(q.toLowerCase())) continue;
    if (!unique.includes(q)) unique.push(q);
    if (unique.length >= 4) break;
  }

  return unique;
}
