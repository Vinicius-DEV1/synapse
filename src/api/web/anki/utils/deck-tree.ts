export interface BaseDeckRecord {
  id: string;
  parent_id?: string | null;
  deleted_at?: string | null;
}

/**
 * Collects a root deck ID and all its descendant sub-deck IDs into a Set.
 * Uses cycle-safe iterative traversal to prevent infinite loops.
 */
export function collectDescendantDeckIds(
  activeDecks: BaseDeckRecord[],
  rootDeckId: string
): Set<string> {
  const deckIds = new Set<string>();
  deckIds.add(rootDeckId);

  let added = true;
  // Guard with maximum iterations equal to deck count to prevent infinite loop on circular references
  let iterations = 0;
  const maxIterations = Math.max(activeDecks.length * 2, 100);

  while (added && iterations < maxIterations) {
    added = false;
    iterations++;
    for (const d of activeDecks) {
      if (d.parent_id && deckIds.has(d.parent_id) && !deckIds.has(d.id)) {
        deckIds.add(d.id);
        added = true;
      }
    }
  }

  return deckIds;
}
