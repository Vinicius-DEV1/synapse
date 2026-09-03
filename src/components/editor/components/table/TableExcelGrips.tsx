import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  selectColumnAtIndex,
  selectRowAtIndex,
  selectEntireTable,
} from './tableSelectionUtils';

interface TableExcelGripsProps {
  editor: Editor | null;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

interface ColumnGrip {
  index: number;
  label: string;
  left: number;
  width: number;
}

interface RowGrip {
  index: number;
  label: string;
  top: number;
  height: number;
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

export default function TableExcelGrips({ editor, wrapperRef }: TableExcelGripsProps) {
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [columnGrips, setColumnGrips] = useState<ColumnGrip[]>([]);
  const [rowGrips, setRowGrips] = useState<RowGrip[]>([]);
  const [cornerPosition, setCornerPosition] = useState<{ left: number; top: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const updateGrips = useCallback(() => {
    if (!editor || !wrapperRef.current) {
      setActiveTable(null);
      return;
    }

    const wrapper = wrapperRef.current;
    const wrapperRect = wrapper.getBoundingClientRect();

    // Check if editor has an active table or cursor in table
    let tableEl: HTMLTableElement | null = null;
    const domSelection = window.getSelection();

    if (domSelection && domSelection.anchorNode) {
      const node = domSelection.anchorNode instanceof Element ? domSelection.anchorNode : domSelection.anchorNode.parentElement;
      tableEl = node?.closest('table') || null;
    }

    if (!tableEl) {
      const hoveredTable = wrapper.querySelector('.ProseMirror table:hover');
      if (hoveredTable instanceof HTMLTableElement) {
        tableEl = hoveredTable;
      }
    }

    if (!tableEl) {
      setActiveTable(null);
      setColumnGrips([]);
      setRowGrips([]);
      setCornerPosition(null);
      return;
    }

    setActiveTable(tableEl);

    // Compute column positions from first row
    const firstRowCells = tableEl.querySelectorAll<HTMLTableCellElement>('tr:first-child > th, tr:first-child > td');
    const cols: ColumnGrip[] = [];
    firstRowCells.forEach((cell, idx) => {
      const cellRect = cell.getBoundingClientRect();
      cols.push({
        index: idx,
        label: getColumnLetter(idx),
        left: cellRect.left - wrapperRect.left,
        width: cellRect.width,
      });
    });

    // Compute row positions from all rows
    const rowsList = tableEl.querySelectorAll<HTMLTableRowElement>('tr');
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
      setCornerPosition({
        left: cols[0].left - 24,
        top: rows[0].top - 24,
      });
    }

    setColumnGrips(cols);
    setRowGrips(rows);
  }, [editor, wrapperRef]);

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
      if (th && th.parentElement) {
        const cells = Array.from(th.parentElement.children);
        const colIdx = cells.indexOf(th);
        if (colIdx >= 0) {
          e.preventDefault();
          e.stopPropagation();
          selectColumnAtIndex(editor, colIdx);
        }
      }
    };

    dom.addEventListener('mousemove', handleMouseMove, { passive: true });
    dom.addEventListener('dblclick', handleDblClick);
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });

    // Also update on editor transactions/selections
    editor.on('selectionUpdate', scheduleUpdate);
    editor.on('transaction', scheduleUpdate);

    return () => {
      dom.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
      editor.off('selectionUpdate', scheduleUpdate);
      editor.off('transaction', scheduleUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, scheduleUpdate]);

  if (!activeTable || (columnGrips.length === 0 && rowGrips.length === 0)) {
    return null;
  }

  return (
    <div className="table-excel-grips pointer-events-none absolute inset-0 z-30" data-table-grip="container">
      {/* Top-Left Corner Grip: Selects Entire Table */}
      {cornerPosition && (
        <button
          type="button"
          data-table-grip="corner"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (editor) selectEntireTable(editor);
          }}
          style={{
            left: `${cornerPosition.left}px`,
            top: `${cornerPosition.top}px`,
          }}
          className="pointer-events-auto absolute w-5 h-5 rounded flex items-center justify-center bg-dark-bg/90 border border-white/10 hover:border-brand-500 hover:bg-brand-500/20 text-dark-subtext hover:text-white transition-all shadow-md active:scale-95 text-[11px]"
          title="Selecionar tabela inteira (Excel)"
        >
          ⤡
        </button>
      )}

      {/* Top Column Grips (A, B, C...) */}
      {columnGrips.map((col) => (
        <button
          key={`col-${col.index}`}
          type="button"
          data-table-grip={`col-${col.index}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (editor) selectColumnAtIndex(editor, col.index);
          }}
          style={{
            left: `${col.left}px`,
            top: cornerPosition ? `${cornerPosition.top}px` : '0px',
            width: `${col.width}px`,
            height: '20px',
          }}
          className="pointer-events-auto absolute flex items-center justify-center bg-dark-bg/90 hover:bg-brand-500/20 border border-white/10 hover:border-brand-500 text-dark-subtext hover:text-white rounded text-[11px] font-semibold transition-all shadow-sm active:scale-95 group"
          title={`Selecionar coluna ${col.label} inteira (Excel)`}
        >
          <span>{col.label}</span>
          <span className="opacity-0 group-hover:opacity-100 ml-1 text-[9px] text-brand-400">↓</span>
        </button>
      ))}

      {/* Left Row Grips (1, 2, 3...) */}
      {rowGrips.map((row) => (
        <button
          key={`row-${row.index}`}
          type="button"
          data-table-grip={`row-${row.index}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (editor) selectRowAtIndex(editor, row.index);
          }}
          style={{
            left: cornerPosition ? `${cornerPosition.left}px` : '0px',
            top: `${row.top}px`,
            width: '20px',
            height: `${row.height}px`,
          }}
          className="pointer-events-auto absolute flex items-center justify-center bg-dark-bg/90 hover:bg-brand-500/20 border border-white/10 hover:border-brand-500 text-dark-subtext hover:text-white rounded text-[10px] font-semibold transition-all shadow-sm active:scale-95 group"
          title={`Selecionar linha ${row.label} inteira (Excel)`}
        >
          <span>{row.label}</span>
        </button>
      ))}
    </div>
  );
}
