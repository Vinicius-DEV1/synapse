import type { HierarchyNode } from '../../../utils/hierarchy';

export type SearchScope = 'all' | 'title' | 'content' | 'pinned';

export interface SearchResultItem {
  id: string;
  title: string;
  icon: string;
  content?: string;
  matchType: 'title' | 'path' | 'content' | 'recent' | 'pinned';
  ancestors: HierarchyNode[];
  is_pinned?: number;
  isRecent?: boolean;
  score: number;
}

/** Escapes special regex characters for safe use in new RegExp() */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import { cleanHtmlText } from '../../../utils/content-extractor';
import { LruMap } from '../../../utils/lru-cache';

export const stripHtml = cleanHtmlText;

const PLAIN_TEXT_CACHE_LIMIT = 1000;
const plainTextCache = new LruMap<string, string>(PLAIN_TEXT_CACHE_LIMIT);

export function getCachedPlainText(pageId: string, content: string | undefined): string {
  if (!content) return '';
  const key = `${pageId}_${content.length}`;
  const cached = plainTextCache.get(key);
  if (cached !== undefined) return cached;
  const stripped = stripHtml(content);
  plainTextCache.set(key, stripped);
  return stripped;
}

/** Invalidate or clear the plain text cache to prevent memory accumulation */
export function clearPlainTextCache(): void {
  plainTextCache.clear();
}

/** Returns the active count of cached plain text records */
export function getPlainTextCacheSize(): number {
  return plainTextCache.size;
}
