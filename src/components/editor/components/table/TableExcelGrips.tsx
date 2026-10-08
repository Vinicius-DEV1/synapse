import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { Editor } from '@tiptap/react';
import { selectEntireTable } from './tableSelectionUtils';
import TableColumnGrip, { type ColumnGrip, type DragState } from './TableColumnGrip';
import TableRowGrip, { type RowGrip } from './TableRowGrip';
import TableDropIndicator from './TableDropIndicator';
import TableCellOverlay from './TableCellOverlay';
import { useTableFilter } from '../../hooks/useTableFilter';
import { findHeaderCellPos } from './tableColumnUtils';
import type { TableColumnType, ColumnFilter } from './tableColumnTypes';

const TableColumnTypePopover = lazy(() => import('./TableColumnTypePopover'));

interface TableExcelGripsProps {
  editor: Editor | null;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function readColumnType(th: HTMLTableCellElement): TableColumnType {
  return (th.getAttribute('data-column-type') as TableColumnType) || 'text';
}

function readColumnOptions(th: HTMLTableCellElement): string | null {
  return th.getAttribute('data-column-options');
}

export default function TableExcelGrips({ editor, wrapperRef }: TableExcelGripsProps) {
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [columnGrips, setColumnGrips] = useState<ColumnGrip[]>([]);
  const [rowGrips, setRowGrips] = useState<RowGrip[]>([]);
  const [cornerPosition, setCornerPosition] = useState<{ left: number; top: number } | null>(null);
  const [tableBounds, setTableBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [typePopoverCol, setTypePopoverCol] = useState<number | null>(null);

  const rafRef = useRef<number | null>(null);
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  activeTableRef.current = activeTable;

  const lastMetricsRef = useRef<{
    table: HTMLTableElement | null;
    left: number;
    top: number;
    width: number;
    height: number;
    colCount: number;
    rowCount: number;
    colTypesSig: string;
  } | null>(null);

  const { filters, addFilter, removeFilter, updateFilter } = useTableFilter(editor, activeTable);

  const updateGrips = useCallback(() => {
    if (!editor || editor.isDestroyed || !wrapperRef.current) {
      if (activeTableRef.current !== null) {
        setActiveTable(null);
        setColumnGrips([]);
        setRowGrips([]);
        setCornerPosition(null);
        lastMetricsRef.current = null;
      }
      return;
    }

    const wrapper = wrapperRef.current;
    let tableEl: HTMLTableElement | null = null;

    if (editor.isActive('table')) {
      const domSelection = window.getSelection();
      if (domSelection?.anchorNode) {
        const node = domSelection.anchorNode instanceof Element ? domSelection.anchorNode : domSelection.anchorNode.parentElement;
        tableEl = node?.closest('table') || null;
      }
    }

    if (!tableEl) {
      const hoveredTable = wrapper.querySelector('.ProseMirror table:hover');
      if (hoveredTable instanceof HTMLTableElement) {
        tableEl = hoveredTable;
      }
    }

    if (!tableEl) {
      if (activeTableRef.current !== null) {
        setActiveTable(null);
        setColumnGrips([]);
        setRowGrips([]);
        setCornerPosition(null);
        lastMetricsRef.current = null;
      }
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const tableRect = tableEl.getBoundingClientRect();
    const relLeft = tableRect.left - wrapperRect.left;
    const relTop = tableRect.top - wrapperRect.top;

    const firstRowCells = tableEl.querySelectorAll<HTMLTableCellElement>('tr:first-child > th, tr:first-child > td');
    const rowsList = tableEl.querySelectorAll<HTMLTableRowElement>('tr');

    const colTypesSig = Array.from(firstRowCells)
      .map((c) => `${c.getAttribute('data-column-type') || 'text'}:${c.getAttribute('data-column-options') || ''}`)
      .join('|');

    const last = lastMetricsRef.current;
    if (
      last &&
      last.table === tableEl &&
      last.colTypesSig === colTypesSig &&
      Math.abs(last.left - relLeft) < 0.5 &&
      Math.abs(last.top - relTop) < 0.5 &&
      Math.abs(last.width - tableRect.width) < 0.5 &&
      Math.abs(last.height - tableRect.height) < 0.5 &&
      last.colCount === firstRowCells.length &&
      last.rowCount === rowsList.length
    ) {
      return;
    }

    lastMetricsRef.current = {
      table: tableEl,
      left: relLeft,
      top: relTop,
      width: tableRect.width,
      height: tableRect.height,
      colCount: firstRowCells.length,
      rowCount: rowsList.length,
      colTypesSig,
    };

    setActiveTable(tableEl);
    setTableBounds({ width: tableRect.width, height: tableRect.height });

    const filterIndexSet = new Set(filters.map((f) => f.columnIndex));
    const cols: ColumnGrip[] = [];
    firstRowCells.forEach((cell, idx) => {
      const cellRect = cell.getBoundingClientRect();
      cols.push({
        index: idx,
        label: getColumnLetter(idx),
        left: cellRect.left - wrapperRect.left,
        width: cellRect.width,
        columnType: readColumnType(cell),
        hasFilter: filterIndexSet.has(idx),
      });
    });

    const rows: RowGrip[] = [];
    rowsList.forEach((row, idx) => {
      const rowRect = row.getBoundingClientRect();
      rows.push({
        index: idx,
        label: String(idx + 1),
        top: rowRect.top - wrapperRect.top,
        height: rowRect.height,
      });
    });

    if (cols.length > 0 && rows.length > 0) {
      setCornerPosition({ left: cols[0].left - 24, top: rows[0].top - 24 });
    }

    setColumnGrips(cols);
    setRowGrips(rows);
  }, [editor, wrapperRef, filters]);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateGrips);
  }, [updateGrips]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('table') || target.closest('[data-table-grip]')) {
        scheduleUpdate();
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const th = target.closest('th');
      if (th?.parentElement) {
        const cells = Array.from(th.parentElement.children);
        const colIdx = cells.indexOf(th);
        if (colIdx >= 0) {
          e.preventDefault();
          e.stopPropagation();
          import('./tableSelectionUtils').then(({ selectColumnAtIndex }) => {
            selectColumnAtIndex(editor, colIdx);
          });
        }
      }
    };

    const handleWindowDragEnd = () => setDragState(null);
    const handleTransaction = () => {
      if (editor.isActive('table') || activeTableRef.current !== null) {
        scheduleUpdate();
      }
    };

    dom.addEventListener('mousemove', handleMouseMove, { passive: true });
    dom.addEventListener('dblclick', handleDblClick);
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('dragend', handleWindowDragEnd);
    editor.on('selectionUpdate', handleTransaction);
    editor.on('transaction', handleTransaction);

    return () => {
      dom.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('dragend', handleWindowDragEnd);
      editor.off('selectionUpdate', handleTransaction);
      editor.off('transaction', handleTransaction);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, scheduleUpdate]);

  const handleOpenTypePopover = useCallback((colIndex: number) => {
    setTypePopoverCol((prev) => (prev === colIndex ? null : colIndex));
  }, []);

  const handleTypeChange = useCallback(
    (type: TableColumnType, options?: string) => {
      if (!editor || !activeTable || typePopoverCol === null) return;

      const headerPos = findHeaderCellPos(editor, activeTable, typePopoverCol);
      if (headerPos === null) return;

      const { state } = editor;
      const tr = state.tr.setNodeMarkup(headerPos, undefined, {
        ...state.doc.nodeAt(headerPos)?.attrs,
        columnType: type,
        columnOptions: type === 'select' ? (options ?? null) : null,
        numberFormat: type === 'number' ? 'plain' : null,
        dateFormat: type === 'date' ? 'iso' : null,
      });

      lastMetricsRef.current = null;
      editor.view.dispatch(tr);
      scheduleUpdate();
    },
    [editor, activeTable, typePopoverCol, scheduleUpdate]
  );

  const handleFilterChange = useCallback(
    (filter: ColumnFilter | null) => {
      if (typePopoverCol === null) return;
      const existingIdx = filters.findIndex((f) => f.columnIndex === typePopoverCol);

      if (filter === null) {
        if (existingIdx !== -1) removeFilter(existingIdx);
      } else if (existingIdx !== -1) {
        updateFilter(existingIdx, filter);
      } else {
        addFilter(filter);
      }
    },
    [typePopoverCol, filters, addFilter, removeFilter, updateFilter]
  );

  if (!activeTable || (columnGrips.length === 0 && rowGrips.length === 0)) {
    return null;
  }

  let dropIndicatorColLeft: number | null = null;
  if (dragState?.type === 'col') {
    const targetCol = columnGrips.find((c) => c.index === dragState.targetIndex);
    if (targetCol) {
      dropIndicatorColLeft = dragState.dropPosition === 'before' ? targetCol.left : targetCol.left + targetCol.width;
    }
  }

  let dropIndicatorRowTop: number | null = null;
  if (dragState?.type === 'row') {
    const targetRow = rowGrips.find((r) => r.index === dragState.targetIndex);
    if (targetRow) {
      dropIndicatorRowTop = dragState.dropPosition === 'before' ? targetRow.top : targetRow.top + targetRow.height;
    }
  }

  const popoverCol = typePopoverCol !== null ? columnGrips.find((c) => c.index === typePopoverCol) : null;
  const popoverFilter = typePopoverCol !== null ? filters.find((f) => f.columnIndex === typePopoverCol) ?? null : null;

  let popoverOptions: string | null = null;
  if (popoverCol && activeTable) {
    const th = activeTable.querySelectorAll<HTMLTableCellElement>('tr:first-child > th')[popoverCol.index];
    if (th) popoverOptions = readColumnOptions(th);
  }

  return (
    <div className="table-excel-grips-layer pointer-events-none absolute inset-0 z-20 overflow-visible">
      {cornerPosition && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (editor) selectEntireTable(editor);
          }}
          style={{ left: `${cornerPosition.left}px`, top: `${cornerPosition.top}px` }}
          className="pointer-events-auto absolute w-5 h-5 rounded flex items-center justify-center bg-dark-bg/90 border border-white/10 hover:border-brand-500 hover:bg-brand-500/20 text-dark-subtext hover:text-white transition-all shadow-md active:scale-95 text-[11px]"
          title="Selecionar tabela inteira (Excel)"
        >
          ⤡
        </button>
      )}

      {columnGrips.map((col) => (
        <TableColumnGrip
          key={`col-${col.index}`}
          col={col}
          editor={editor}
          cornerPosition={cornerPosition}
          dragState={dragState}
          setDragState={setDragState}
          onOpenTypePopover={handleOpenTypePopover}
        />
      ))}

      {rowGrips.map((row) => (
        <TableRowGrip
          key={`row-${row.index}`}
          row={row}
          editor={editor}
          cornerPosition={cornerPosition}
          dragState={dragState}
          setDragState={setDragState}
        />
      ))}

      <TableDropIndicator
        dropIndicatorColLeft={dropIndicatorColLeft}
        dropIndicatorRowTop={dropIndicatorRowTop}
        cornerPosition={cornerPosition}
        tableBounds={tableBounds}
      />

      {/* Interactive Cell Overlay for select dropdowns, checkbox toggles, and date pickers */}
      <TableCellOverlay
        editor={editor}
        activeTable={activeTable}
        wrapperRef={wrapperRef}
      />

      {/* Column Type Configuration Popover */}
      {popoverCol && editor && (
        <Suspense fallback={null}>
          <TableColumnTypePopover
            editor={editor}
            columnIndex={popoverCol.index}
            currentType={popoverCol.columnType}
            currentOptions={popoverOptions}
            columnFilter={popoverFilter}
            onTypeChange={handleTypeChange}
            onFilterChange={handleFilterChange}
            onClose={() => setTypePopoverCol(null)}
            anchorLeft={popoverCol.left}
            anchorTop={(cornerPosition?.top ?? 0) + 24}
          />
        </Suspense>
      )}
    </div>
  );
}
