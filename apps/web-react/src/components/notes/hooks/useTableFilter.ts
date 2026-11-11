import { useState, useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  evaluateFilter,
  type ColumnFilter,
  type TableColumnType,
} from '../components/table/tableColumnTypes';

/**
 * Reads the column type from the <th> element at `colIndex` in the given table.
 * Falls back to 'text' if the attribute is missing.
 */
function getColumnTypeFromDOM(
  tableEl: HTMLTableElement,
  colIndex: number
): TableColumnType {
  const headerCells = tableEl.querySelectorAll<HTMLTableCellElement>(
    'tr:first-child > th'
  );
  const th = headerCells[colIndex];
  return (th?.getAttribute('data-column-type') as TableColumnType) || 'text';
}

/**
 * Extracts the text content from a cell element, stripping any HTML formatting.
 */
function getCellTextContent(cell: HTMLTableCellElement): string {
  return cell.textContent?.trim() ?? '';
}

interface UseTableFilterReturn {
  /** Currently active filters. */
  filters: readonly ColumnFilter[];
  /** Adds a new filter to the active set. */
  addFilter: (filter: ColumnFilter) => void;
  /** Removes a filter at the given index. */
  removeFilter: (index: number) => void;
  /** Updates a filter at the given index. */
  updateFilter: (index: number, filter: ColumnFilter) => void;
  /** Clears all active filters. */
  clearFilters: () => void;
  /** Number of currently active filters. */
  activeFilterCount: number;
}

/**
 * Manages per-table column filters and applies CSS row visibility.
 *
 * Filtering is **purely visual** — rows are hidden via `display:none` on <tr> elements.
 * The ProseMirror document is never mutated by filters, avoiding:
 * - Yjs/CRDT conflicts
 * - Undo history pollution
 * - Document corruption
 *
 * Filters are transient and cleared on component unmount.
 */
export function useTableFilter(
  _editor: Editor | null,
  tableEl: HTMLTableElement | null
): UseTableFilterReturn {
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const rafRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  tableRef.current = tableEl;

  // Reset filters when active table changes to avoid state leaks between tables
  const prevTableRef = useRef<HTMLTableElement | null>(tableEl);
  useEffect(() => {
    if (prevTableRef.current !== tableEl) {
      prevTableRef.current = tableEl;
      setFilters([]);
    }
  }, [tableEl]);

  const applyFilters = useCallback(
    (currentFilters: readonly ColumnFilter[]) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const table = tableRef.current;
        if (!table) return;

        const rows = table.querySelectorAll<HTMLTableRowElement>('tr');
        if (rows.length === 0) return;

        // Skip the header row (index 0)
        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
          const row = rows[rowIdx];
          const cells = row.querySelectorAll<HTMLTableCellElement>('td');

          if (currentFilters.length === 0) {
            // No filters — show all rows
            row.style.removeProperty('display');
            row.removeAttribute('data-filtered-hidden');
            continue;
          }

          // A row passes if ALL filters match (AND logic)
          let passes = true;
          for (const filter of currentFilters) {
            const cell = cells[filter.columnIndex];
            if (!cell) {
              passes = false;
              break;
            }

            const cellText = getCellTextContent(cell);
            const columnType = getColumnTypeFromDOM(table, filter.columnIndex);

            if (!evaluateFilter(filter, cellText, columnType)) {
              passes = false;
              break;
            }
          }

          if (passes) {
            row.style.removeProperty('display');
            row.removeAttribute('data-filtered-hidden');
          } else {
            row.style.display = 'none';
            row.setAttribute('data-filtered-hidden', 'true');
          }
        }
      });
    },
    []
  );

  // Re-apply filters whenever they change
  useEffect(() => {
    applyFilters(filters);
  }, [filters, applyFilters, tableEl]);

  // Cleanup: restore all rows on unmount or when table changes
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const table = tableRef.current;
      if (!table) return;

      const rows = table.querySelectorAll<HTMLTableRowElement>(
        'tr[data-filtered-hidden]'
      );
      rows.forEach((row) => {
        row.style.removeProperty('display');
        row.removeAttribute('data-filtered-hidden');
      });
    };
  }, [tableEl]);

  const addFilter = useCallback((filter: ColumnFilter) => {
    setFilters((prev) => [...prev, filter]);
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateFilter = useCallback((index: number, filter: ColumnFilter) => {
    setFilters((prev) => prev.map((f, i) => (i === index ? filter : f)));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  return {
    filters,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    activeFilterCount: filters.length,
  };
}
