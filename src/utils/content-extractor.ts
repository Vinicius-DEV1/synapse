import type { Page } from '../types';

/**
 * Strips HTML tags and returns plain text with fallback.
 */
export function stripHtml(html?: string): string {
  if (!html) return '(página sem conteúdo em texto)';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '(página sem conteúdo em texto)').trim();
}

/**
 * Extracts all Base64 data URLs (data:image/...) embedded in HTML.
 */
export function extractImagesFromHtml(html?: string): string[] {
  if (!html) return [];
  const images: string[] = [];
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const imgTags = tmp.querySelectorAll('img');
  imgTags.forEach(img => {
    const src = img.getAttribute('src') || img.src;
    if (src && src.startsWith('data:image/')) {
      images.push(src);
    }
  });
  return images;
}

/**
 * Traverses and returns a page and all its descendant nodes recursively.
 */
export function getPageAndDescendants(
  rootPageId: string,
  pages: Page[]
): Array<{ id: string; title: string; content?: string }> {
  const result: Array<{ id: string; title: string; content?: string }> = [];
  const queue = [rootPageId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const found = pages.find(p => p.id === currentId);
    if (found) {
      result.push({ id: found.id, title: found.title, content: found.content });
      const children = pages.filter(p => p.parent_id === found.id);
      queue.push(...children.map(c => c.id));
    }
  }
  return result;
}
