import type { Page } from '../types';

/**
 * Remove tags HTML e retorna o texto puro com fallback.
 */
export function stripHtml(html?: string): string {
  if (!html) return '(página sem conteúdo em texto)';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '(página sem conteúdo em texto)').trim();
}

/**
 * Extrai todas as imagens em base64 (data:image/...) presentes no HTML.
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
 * Retorna uma página e todos os seus nós descendentes recursivamente.
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
