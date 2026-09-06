import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import DOMPurify from 'dompurify';

export interface MarkdownToHtmlOptions {
  unwrapBlockquotes?: boolean;
}

/**
 * Strips markdown blockquote markers (> or >>> ) and GitHub callout banners
 * so that content intended for inside a callout or toggle does not create nested containers.
 */
export function stripMarkdownBlockquotes(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .split('\n')
    .map((line) => line.replace(/^[ \t]*>+[ \t]?/, ''))
    .filter((line) => !/^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO)\][ \t]*$/i.test(line.trim()))
    .join('\n');
}

/**
 * Unwraps blockquote and container div elements from sanitized HTML to ensure
 * inner elements (paragraphs, lists, headings) insert as direct children rather than nested blocks.
 */
export function unwrapBlockquoteTags(html: string): string {
  if (!html) return '';

  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = html;

    let bq = container.querySelector('blockquote, div.blockquote-toggle, div.toggle-block');
    while (bq) {
      const parent = bq.parentNode;
      if (!parent) break;
      while (bq.firstChild) {
        parent.insertBefore(bq.firstChild, bq);
      }
      parent.removeChild(bq);
      bq = container.querySelector('blockquote, div.blockquote-toggle, div.toggle-block');
    }
    return container.innerHTML;
  }

  return html.replace(/<\/?blockquote[^>]*>/gi, '').trim();
}

/**
 * Converts markdown text into sanitized semantic HTML suitable for TipTap / ProseMirror schemas.
 * Ensures headings, lists, bold, italics, and code blocks render as native rich text elements.
 * When `unwrapBlockquotes` is true, eliminates nested blockquotes and container wrappers.
 */
export function markdownToHtml(markdown: string, options?: MarkdownToHtmlOptions): string {
  if (!markdown || !markdown.trim()) return '';

  let processedMd = markdown;
  if (options?.unwrapBlockquotes) {
    processedMd = stripMarkdownBlockquotes(markdown);
  }

  const rawHtml = micromark(processedMd, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  const sanitized = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'class', 'data-type'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  });

  if (options?.unwrapBlockquotes) {
    return unwrapBlockquoteTags(sanitized);
  }

  return sanitized;
}

