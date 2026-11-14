/**
 * Tanat Knowledge Ingestion — Multi-format file text extractor.
 *
 * Extracts plain text from:
 * - Plaintext: .txt, .text, .md, .markdown
 * - Data tables / structured: .csv, .tsv, .json, .yaml, .yml
 * - Word documents: .docx (via mammoth browser engine)
 * - Adobe PDF: .pdf (via unpdf web-compatible engine)
 *
 * Runs client-side in browser memory with zero server uploads required.
 */

export interface ExtractedDocument {
  text: string;
  fileName: string;
  fileSize: number;
  wordCount: number;
  suggestedTitle: string;
  suggestedType: 'policy' | 'faq' | 'catalog' | 'document' | 'pdf' | 'text';
}

function cleanTitle(fileName: string): string {
  // Strip extension
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  // Replace underscores, hyphens, and multiple spaces with a single space
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Capitalize words nicely
  return spaced
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function detectSuggestedType(fileName: string, content: string): 'policy' | 'faq' | 'catalog' | 'document' | 'pdf' | 'text' {
  const lowerName = fileName.toLowerCase();
  const lowerContent = content.slice(0, 1500).toLowerCase();

  if (lowerName.endsWith('.pdf')) return 'pdf';
  if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerContent.includes('price') || lowerContent.includes('sku') || lowerContent.includes('catalog')) {
    return 'catalog';
  }
  if (lowerName.includes('faq') || lowerContent.includes('frequently asked') || (lowerContent.includes('q:') && lowerContent.includes('a:'))) {
    return 'faq';
  }
  if (lowerName.includes('policy') || lowerName.includes('sop') || lowerContent.includes('refund policy') || lowerContent.includes('terms of service')) {
    return 'policy';
  }
  if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
    return 'document';
  }
  return 'document';
}

export async function extractTextFromFile(file: File): Promise<ExtractedDocument> {
  const fileName = file.name;
  const lower = fileName.toLowerCase();
  let text = '';

  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.text') ||
    lower.endsWith('.md') ||
    lower.endsWith('.markdown') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.tsv') ||
    lower.endsWith('.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.xml') ||
    lower.endsWith('.html') ||
    lower.endsWith('.htm')
  ) {
    text = await file.text();
  } else if (lower.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const mammothModule = await import('mammoth/mammoth.browser.js');
      const mammoth = (mammothModule as { default?: unknown }).default || mammothModule;
      const res = await (mammoth as { extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }).extractRawText({ arrayBuffer });
      text = res.value || '';
    } catch (err) {
      throw new Error(`Could not parse Word (.docx) file: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (lower.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const { extractText } = await import('unpdf');
      const res = await extractText(arrayBuffer);
      if (Array.isArray(res.text)) {
        text = res.text.join('\n\n');
      } else {
        text = String(res.text || '');
      }
    } catch (err) {
      throw new Error(`Could not extract text from PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    // Attempt fallback to plain text read
    try {
      text = await file.text();
    } catch {
      throw new Error(`Unsupported file type: "${fileName}". Please upload .txt, .docx, .csv, .pdf, .md, or .json.`);
    }
  }

  // Clean null characters or unusual control characters (preserving newlines/tabs)
  const cleanedText = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF]/g, '').trim();

  if (!cleanedText) {
    throw new Error(`The file "${fileName}" appears to be empty or contains no extractable text.`);
  }

  const words = cleanedText.split(/\s+/).filter(Boolean);

  return {
    text: cleanedText,
    fileName,
    fileSize: file.size,
    wordCount: words.length,
    suggestedTitle: cleanTitle(fileName),
    suggestedType: detectSuggestedType(fileName, cleanedText),
  };
}

