import { useState, useCallback } from 'react';

export function useCardSelection(filteredCards: { id: string }[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredCards.length && filteredCards.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map(c => c.id)));
    }
  }, [filteredCards, selectedIds]);

  const toggleSelectGroup = useCallback((group: { id: string }[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      const allSelected = group.every(c => newSet.has(c.id));
      for (const c of group) {
        if (allSelected) newSet.delete(c.id);
        else newSet.add(c.id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    toggleSelectAll,
    toggleSelectGroup,
    clearSelection,
  };
}
