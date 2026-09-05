import { useState, useEffect, useRef, useContext } from 'react';
import { StoreContext, getStoreState } from '../../../../store/useStore';
import type { Page } from '../../../../types';
import { getPageAncestors } from '../../../../utils/hierarchy';
import {
  normalizeLinkUrl,
  extractUrlSignature,
  extractUrlsFromContent,
  isSameUrl,
} from '../utils/urlNormalization';

export interface DuplicatePageInfo {
  id: string;
  title: string;
  icon: string;
  ancestors: { id: string; title: string; icon?: string }[];
  updatedAt?: string;
}

interface CachedPageContent {
  content: string;
  updatedAt: string;
}

// Module-level in-memory cache to prevent redundant IPC / IndexedDB reads across multiple link cards
const pageContentCache = new Map<string, CachedPageContent>();

/**
 * Clears the module-level page content cache (primarily for tests or sync refreshes).
 */
export function clearPageContentCache(): void {
  pageContentCache.clear();
}

/**
 * Pure function to scan pages for duplicate links.
 * Works with resident page content or fetches missing content via window.api.
 */
export async function findDuplicatePagesForLink(
  targetUrl: string,
  pages: Page[],
  currentPageId?: string | null,
  isCancelled?: () => boolean
): Promise<DuplicatePageInfo[]> {
  if (!targetUrl || !pages || pages.length === 0) return [];

  const normalizedTarget = normalizeLinkUrl(targetUrl);
  if (!normalizedTarget) return [];

  const signature = extractUrlSignature(targetUrl);
  const signatureLower = signature ? signature.toLowerCase() : null;

  const matches: DuplicatePageInfo[] = [];

  for (const page of pages) {
    if (isCancelled && isCancelled()) break;

    // Skip current active page and deleted pages
    if (page.id === currentPageId || page.deleted_at) {
      continue;
    }

    let content = page.content;

    // Check module-level cache if resident content is missing or if cached version matches updated_at
    if (!content) {
      const cached = pageContentCache.get(page.id);
      if (cached && (!page.updated_at || cached.updatedAt === page.updated_at)) {
        content = cached.content;
      }
    }

    // Fetch asynchronously via API if still not in memory
    if (!content && typeof window !== 'undefined' && window.api?.getPageContent) {
      try {
        const fullData = await window.api.getPageContent(page.id);
        content = fullData?.content || '';
        if (content) {
          pageContentCache.set(page.id, {
            content,
            updatedAt: page.updated_at || '',
          });
        }
      } catch (err) {
        console.warn(`[useLinkDuplicates] Falha ao carregar conteúdo da página ${page.id}:`, err);
      }
    }

    if (!content) continue;

    // Fast O(1) / substring signature pre-filter before executing regex extraction
    if (signatureLower && !content.toLowerCase().includes(signatureLower)) {
      continue;
    }

    // Extract all URLs from content
    const foundUrls = extractUrlsFromContent(content);
    const hasMatch = foundUrls.some((foundUrl) => isSameUrl(foundUrl, normalizedTarget));

    if (hasMatch) {
      const rawAncestors = getPageAncestors(pages, page.id);
      const ancestors = rawAncestors.map((a) => ({
        id: a.id,
        title: a.title || 'Sem título',
        icon: a.icon || '📄',
      }));

      matches.push({
        id: page.id,
        title: page.title || 'Sem título',
        icon: page.icon || '📄',
        ancestors,
        updatedAt: page.updated_at,
      });
    }
  }

  return matches;
}

/**
 * Background hook that automatically detects whether the given link already exists
 * in other pages within the workspace.
 */
export function useLinkDuplicates(
  url: string | null | undefined,
  currentPageId?: string | null
) {
  const storeCtx = useContext(StoreContext);
  const state = storeCtx?.state || getStoreState();
  const [duplicatePages, setDuplicatePages] = useState<DuplicatePageInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;

    if (!url) {
      setDuplicatePages([]);
      setIsSearching(false);
      return;
    }

    let timer: NodeJS.Timeout | null = null;

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const currentPages = state?.pages || getStoreState().pages;
        const results = await findDuplicatePagesForLink(
          url,
          currentPages,
          currentPageId,
          () => cancelRef.current
        );

        if (!cancelRef.current) {
          setDuplicatePages(results);
        }
      } catch (err) {
        console.warn('[useLinkDuplicates] Erro ao buscar duplicatas de link:', err);
      } finally {
        if (!cancelRef.current) {
          setIsSearching(false);
        }
      }
    };

    // Defer search execution slightly to prevent layout thrashing on fast mounts
    timer = setTimeout(performSearch, 80);

    return () => {
      cancelRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [url, currentPageId, state?.pages]);

  return { duplicatePages, isSearching };
}
