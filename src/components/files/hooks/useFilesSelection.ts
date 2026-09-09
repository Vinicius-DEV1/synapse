import { useState, useCallback, useRef } from 'react';

export interface ClickModifiers {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export function useFilesSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);

  const selectItemWithModifiers = useCallback(
    (id: string, e: ClickModifiers, orderedIds: string[]) => {
      setSelectedIds((prev) => {
        // 1. Ctrl / Cmd: Toggle individual item in or out of selection
        if (e.ctrlKey || e.metaKey) {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
            if (lastSelectedIdRef.current === id) {
              lastSelectedIdRef.current = null;
            }
          } else {
            next.add(id);
            lastSelectedIdRef.current = id;
          }
          return next;
        }

        // 2. Shift: Select continuous range from last selected item to current
        if (e.shiftKey) {
          const anchorId = lastSelectedIdRef.current;
          if (anchorId && orderedIds.includes(anchorId)) {
            const anchorIndex = orderedIds.indexOf(anchorId);
            const targetIndex = orderedIds.indexOf(id);

            if (anchorIndex !== -1 && targetIndex !== -1) {
              const start = Math.min(anchorIndex, targetIndex);
              const end = Math.max(anchorIndex, targetIndex);
              const range = orderedIds.slice(start, end + 1);
              return new Set(range);
            }
          }
          // Fallback if no valid anchor
          lastSelectedIdRef.current = id;
          return new Set([id]);
        }

        // 3. Normal click: Single selection
        lastSelectedIdRef.current = id;
        return new Set([id]);
      });
    },
    []
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (lastSelectedIdRef.current === id) {
          lastSelectedIdRef.current = null;
        }
      } else {
        next.add(id);
        lastSelectedIdRef.current = id;
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds));
    if (allIds.length > 0) {
      lastSelectedIdRef.current = allIds[allIds.length - 1];
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    selectItemWithModifiers,
    toggleSelect,
    selectAll,
    clearSelection,
    lastSelectedId: lastSelectedIdRef.current,
  };
}
