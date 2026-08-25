import { sendToWebView, waitForCryptoReady } from '../services/CryptoWebView';

/**
 * Extracts readable Markdown from a page's CRDT state or HTML content.
 *
 * Priority:
 * 1. crdt_state  → parsed via Yjs in the WebView (handles ProseMirror XML fragments)
 * 2. content     → raw HTML stripped to plain text
 * 3. Empty string → page has no content yet
 *
 * SAFE: this function never throws. Always returns a string.
 */
export async function extractMarkdownFromCrdt(
  content?: string | null,
  crdtState?: string | null
): Promise<string> {
  // 1. Try to decode crdt_state first via WebView Yjs engine
  if (crdtState && crdtState.length > 8) {
    try {
      await waitForCryptoReady();
      const res = await sendToWebView({
        type: 'extractCrdt',
        crdtState,
      });

      const markdown = res?.markdown;

      // '__YJS_NOT_LOADED__' means the CDN failed to load Yjs — fall through to content
      if (markdown && markdown !== '__YJS_NOT_LOADED__' && markdown.trim().length > 0) {
        return markdown.trim();
      }

      if (markdown === '__YJS_NOT_LOADED__') {
        console.warn('[CRDT] Yjs não carregou (CDN offline?). Usando fallback de content.');
      }
    } catch (err) {
      console.warn('[CRDT] Falha ao decodificar crdt_state via WebView:', err);
    }
  }

  // 2. Fallback to raw HTML content field
  if (content && content.trim() && content !== '<p></p>') {
    return stripHtmlToMarkdown(content);
  }

  return '';
}

/**
 * Converts basic HTML to plain Markdown text.
 * Handles headings, paragraphs, lists, bold, italic, inline code.
 */
function stripHtmlToMarkdown(html: string): string {
  return html
    // Block-level
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // Inline
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up excess blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
