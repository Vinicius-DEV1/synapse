import type { Page } from '../types';

/**
 * Checks whether `candidateChildId` is a descendant of `parentId` in the page tree.
 * Prevents cyclic dependency creation (e.g. A -> B -> A).
 */
export function isPageDescendant(
  pages: Array<Pick<Page, 'id' | 'parent_id'>>,
  parentId: string,
  candidateChildId: string
): boolean {
  if (!parentId || !candidateChildId) return false;
  if (parentId === candidateChildId) return true;

  const pageMap = new Map<string, Pick<Page, 'id' | 'parent_id'>>();
  for (const page of pages) {
    pageMap.set(page.id, page);
  }

  let currentId: string | null | undefined = candidateChildId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);

    const currentPage = pageMap.get(currentId);
    if (!currentPage || !currentPage.parent_id) {
      break;
    }

    if (currentPage.parent_id === parentId) {
      return true;
    }

    currentId = currentPage.parent_id;
  }

  return false;
}

/**
 * Validates whether a page move operation is permitted.
 * Returns `false` if `sourceId` attempts to become a child of itself or its descendants.
 */
export function isValidHierarchyMove(
  pages: Array<Pick<Page, 'id' | 'parent_id'>>,
  sourceId: string,
  targetParentId: string | null
): boolean {
  if (!sourceId) return false;
  if (targetParentId === null) return true;
  if (sourceId === targetParentId) return false;
  return !isPageDescendant(pages, sourceId, targetParentId);
}

export interface HierarchyNode {
  id: string;
  title: string;
  icon?: string;
  parent_id?: string | null;
}

/**
 * Returns ancestor pages ordered from root to immediate parent of `pageId`.
 * Excludes `pageId` itself. Protected against cyclic references.
 */
export function getPageAncestors<T extends HierarchyNode>(
  pages: T[],
  pageId: string
): T[] {
  if (!pageId) return [];
  const pageMap = new Map<string, T>();
  for (const page of pages) {
    pageMap.set(page.id, page);
  }

  const ancestors: T[] = [];
  const visited = new Set<string>();
  let current = pageMap.get(pageId);

  while (current && current.parent_id) {
    if (visited.has(current.parent_id)) {
      break;
    }
    visited.add(current.parent_id);
    const parent = pageMap.get(current.parent_id);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}

/**
 * Returns full page path (ancestors + current page at the end).
 */
export function getPagePath<T extends HierarchyNode>(
  pages: T[],
  pageId: string
): T[] {
  if (!pageId) return [];
  const ancestors = getPageAncestors(pages, pageId);
  const current = pages.find(p => p.id === pageId);
  if (current) {
    return [...ancestors, current];
  }
  return ancestors;
}

/**
 * Returns breadcrumb string representation of ancestor chain or full path.
 */
export function getPageBreadcrumbString(
  pages: HierarchyNode[],
  pageId: string,
  options?: {
    includeSelf?: boolean;
    separator?: string;
    rootLabel?: string;
    maxAncestors?: number;
  }
): string {
  const {
    includeSelf = false,
    separator = ' › ',
    rootLabel = 'Início',
    maxAncestors,
  } = options || {};

  const items = includeSelf ? getPagePath(pages, pageId) : getPageAncestors(pages, pageId);
  if (items.length === 0) {
    return rootLabel;
  }

  let displayItems = items;
  if (maxAncestors && items.length > maxAncestors) {
    displayItems = [
      items[0],
      { id: '__ellipsis__', title: '...' },
      ...items.slice(items.length - (maxAncestors - 1)),
    ];
  }

  return displayItems.map(item => item.title || 'Sem título').join(separator);
}
