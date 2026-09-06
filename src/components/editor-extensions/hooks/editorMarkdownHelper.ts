import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import DOMPurify from 'dompurify';

/**
 * Converts markdown text into sanitized semantic HTML suitable for TipTap / ProseMirror schemas.
 * Ensures headings, lists, bold, italics, and code blocks render as native rich text elements.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  const rawHtml = micromark(markdown, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'class', 'data-type'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  });
}
