import type { AppState, Page } from '../types';
import { filterActivePages } from './page-filter';

/**
 * Compares two pages predictably:
 * 1. sort_order (manual drag/drop order in grid/sidebar)
 * 2. Natural alphanumeric title order (e.g. 01-08-2026 < 02-08-2026 < 28-08-2026 < 30-08-2026)
 * 3. created_at timestamp fallback
 */
export function comparePages(a: Page, b: Page): number {
  const orderA = a.sort_order ?? 0;
  const orderB = b.sort_order ?? 0;
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  const titleA = (a.title || '').trim();
  const titleB = (b.title || '').trim();
  const titleDiff = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
  if (titleDiff !== 0) {
    return titleDiff;
  }

  const createdA = new Date(a.created_at || 0).getTime();
  const createdB = new Date(b.created_at || 0).getTime();
  return createdA - createdB;
}

/**
 * Returns all sibling pages that belong to the same level/folder as the given page,
 * ordered predictably by sort_order and natural title alphanumeric comparison.
 */
export function getSiblingPages(state: AppState, page: Page | null): Page[] {
  if (!page) return [];

  const activePages = filterActivePages(state.pages);

  if (page.parent_id !== null) {
    return activePages
      .filter((p) => p.parent_id === page.parent_id)
      .sort(comparePages);
  }

  if (page.is_pinned) {
    return activePages
      .filter((p) => p.is_pinned)
      .sort((a, b) => {
        const pinA = a.pinned_order ?? 0;
        const pinB = b.pinned_order ?? 0;
        if (pinA !== pinB) return pinA - pinB;
        return comparePages(a, b);
      });
  }

  return activePages
    .filter((p) => p.parent_id === null && !p.is_pinned)
    .sort(comparePages);
}

/**
 * Returns the immediate previous and next sibling pages within the same folder/level.
 */
export function getSiblingPageNavigation(
  state: AppState,
  page: Page | null
): { prevPage: Page | null; nextPage: Page | null } {
  if (!page) return { prevPage: null, nextPage: null };

  const siblings = getSiblingPages(state, page);
  const currentIndex = siblings.findIndex((p) => p.id === page.id);

  if (currentIndex === -1) return { prevPage: null, nextPage: null };

  return {
    prevPage: currentIndex > 0 ? siblings[currentIndex - 1] : null,
    nextPage: currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null,
  };
}

/**
 * Flattens the page tree into a linear list in natural sequential order:
 * 1. Pinned pages (ordered by pinned_order, then comparePages)
 * 2. Root pages (ordered by comparePages)
 * 3. Children recursively (ordered by comparePages)
 */
export function getFlatPageOrder(state: AppState): Page[] {
  const flatList: Page[] = [];
  const activePages = filterActivePages(state.pages);

  // 1. Pinned pages
  const pinnedPages = activePages
    .filter((p) => p.is_pinned)
    .sort((a, b) => {
      const pinA = a.pinned_order ?? 0;
      const pinB = b.pinned_order ?? 0;
      if (pinA !== pinB) return pinA - pinB;
      return comparePages(a, b);
    });

  flatList.push(...pinnedPages);

  // 2. Root pages
  const rootPages = activePages
    .filter((p) => p.parent_id === null && !p.is_pinned)
    .sort(comparePages);

  // Recursive function to add children
  const addChildren = (parentId: string) => {
    const children = activePages
      .filter((p) => p.parent_id === parentId && !p.is_pinned)
      .sort(comparePages);

    for (const child of children) {
      flatList.push(child);
      addChildren(child.id);
    }
  };

  // Add roots and their children
  for (const root of rootPages) {
    flatList.push(root);
    addChildren(root.id);
  }

  return flatList;
}
