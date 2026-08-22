import type { AppState, Page } from '../types';

/**
 * Flattens the page tree into a linear list exactly as it would appear in the sidebar visually.
 * 1. Pinned pages (ordered by pinned_order)
 * 2. Root pages (ordered by updated_at descending)
 * 3. Children recursively (ordered by updated_at descending)
 */
export function getFlatPageOrder(state: AppState): Page[] {
  const flatList: Page[] = [];

  // 1. Pinned pages
  const pinnedPages = state.pages
    .filter((p) => p.is_pinned)
    .sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));
  
  flatList.push(...pinnedPages);

  // 2. Root pages
  const rootPages = state.pages
    .filter((p) => p.parent_id === null && !p.is_pinned)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Recursive function to add children
  const addChildren = (parentId: string) => {
    // If the user wants to traverse everything regardless of expanded state, remove this check.
    // Given the prompt "tudo na ordem? a mesma que aparece na sidebar", we will traverse all nodes 
    // as if they were expanded so the navigation is predictable.

    const children = state.pages
      .filter((p) => p.parent_id === parentId && !p.is_pinned)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    for (const child of children) {
      flatList.push(child);
      // Recursively add children's children
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
