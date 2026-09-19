import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  selectColumnAtIndex,
  selectRowAtIndex,
  selectEntireTable,
  moveColumnAtIndex,
  moveRowAtIndex,
  computeDropIndex,
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

interface DragState {
  type: 'col' | 'row';
  fromIndex: number;
  targetIndex: number;
  dropPosition: 'before' | 'after';
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
  const [tableBounds, setTableBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  activeTableRef.current = activeTable;

  const updateGrips = useCallback(() => {
    if (!editor || editor.isDestroyed || !wrapperRef.current) {
      if (activeTableRef.current !== null) {
        setActiveTable(null);
        setColumnGrips([]);
        setRowGrips([]);
        setCornerPosition(null);
      }
      return;
    }

    const wrapper = wrapperRef.current;

    // Fast check: Is cursor currently inside a table according to ProseMirror schema?
    const isCursorInTable = editor.isActive('table');
    let tableEl: HTMLTableElement | null = null;

    if (isCursorInTable) {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.anchorNode) {
        const node = domSelection.anchorNode instanceof Element ? domSelection.anchorNode : domSelection.anchorNode.parentElement;
        tableEl = node?.closest('table') || null;
      }
    }

    // Fallback: Check if mouse is hovering over a table
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
      }
      return;
    }

    // Only read DOM geometry if an active table actually exists
    const wrapperRect = wrapper.getBoundingClientRect();
    const tableRect = tableEl.getBoundingClientRect();
    setTableBounds({
      width: tableRect.width,
      height: tableRect.height,
    });

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

    const handleWindowDragEnd = () => {
      setDragState(null);
    };

    dom.addEventListener('mousemove', handleMouseMove, { passive: true });
    dom.addEventListener('dblclick', handleDblClick);
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('dragend', handleWindowDragEnd);

    // Also update on editor transactions/selections
    editor.on('selectionUpdate', scheduleUpdate);
    editor.on('transaction', scheduleUpdate);

    return () => {
      dom.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('dragend', handleWindowDragEnd);
      editor.off('selectionUpdate', scheduleUpdate);
      editor.off('transaction', scheduleUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, scheduleUpdate]);

  if (!activeTable || (columnGrips.length === 0 && rowGrips.length === 0)) {
    return null;
  }

  // Calculate position for drop indicators
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

  return (
    <div
      className="table-excel-grips pointer-events-none absolute inset-0 z-20"
      data-table-grip="container"
      onDragOver={(e) => {
        if (dragState) e.preventDefault();
      }}
      onDrop={(e) => {
        if (dragState) {
          e.preventDefault();
          setDragState(null);
        }
      }}
    >
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
      {columnGrips.map((col) => {
        const isBeingDragged = dragState?.type === 'col' && dragState.fromIndex === col.index;
        return (
          <button
            key={`col-${col.index}`}
            type="button"
            draggable
            data-table-grip={`col-${col.index}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) selectColumnAtIndex(editor, col.index);
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', `table-col:${col.index}`);
              e.dataTransfer.effectAllowed = 'move';
              setDragState({
                type: 'col',
                fromIndex: col.index,
                targetIndex: col.index,
                dropPosition: 'before',
              });
            }}
            onDragOver={(e) => {
              if (!dragState || dragState.type !== 'col') return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const rect = e.currentTarget.getBoundingClientRect();
              const midX = rect.left + rect.width / 2;
              const dropPosition = e.clientX < midX ? 'before' : 'after';
              if (dragState.targetIndex !== col.index || dragState.dropPosition !== dropPosition) {
                setDragState({
                  type: 'col',
                  fromIndex: dragState.fromIndex,
                  targetIndex: col.index,
                  dropPosition,
                });
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!dragState || dragState.type !== 'col' || !editor) {
                setDragState(null);
                return;
              }
              const toIndex = computeDropIndex(dragState.fromIndex, col.index, dragState.dropPosition);
              setDragState(null);
              if (toIndex !== null) {
                moveColumnAtIndex(editor, dragState.fromIndex, toIndex);
              }
            }}
            onDragEnd={() => {
              setDragState(null);
            }}
            style={{
              left: `${col.left}px`,
              top: cornerPosition ? `${cornerPosition.top}px` : '0px',
              width: `${col.width}px`,
              height: '20px',
            }}
            className={`pointer-events-auto absolute flex items-center justify-center bg-dark-bg/90 hover:bg-brand-500/20 border border-white/10 hover:border-brand-500 text-dark-subtext hover:text-white rounded text-[11px] font-semibold transition-all shadow-sm active:scale-95 group cursor-grab active:cursor-grabbing ${
              isBeingDragged ? 'opacity-30 border-brand-500 bg-brand-500/30' : ''
            }`}
            title={`Coluna ${col.label} • Arraste para reordenar ou clique para selecionar`}
          >
            <span>{col.label}</span>
            <span className="opacity-0 group-hover:opacity-100 ml-1 text-[9px] text-brand-400 select-none">↔</span>
          </button>
        );
      })}

      {/* Left Row Grips (1, 2, 3...) */}
      {rowGrips.map((row) => {
        const isBeingDragged = dragState?.type === 'row' && dragState.fromIndex === row.index;
        return (
          <button
            key={`row-${row.index}`}
            type="button"
            draggable
            data-table-grip={`row-${row.index}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) selectRowAtIndex(editor, row.index);
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', `table-row:${row.index}`);
              e.dataTransfer.effectAllowed = 'move';
              setDragState({
                type: 'row',
                fromIndex: row.index,
                targetIndex: row.index,
                dropPosition: 'before',
              });
            }}
            onDragOver={(e) => {
              if (!dragState || dragState.type !== 'row') return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const rect = e.currentTarget.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              const dropPosition = e.clientY < midY ? 'before' : 'after';
              if (dragState.targetIndex !== row.index || dragState.dropPosition !== dropPosition) {
                setDragState({
                  type: 'row',
                  fromIndex: dragState.fromIndex,
                  targetIndex: row.index,
                  dropPosition,
                });
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!dragState || dragState.type !== 'row' || !editor) {
                setDragState(null);
                return;
              }
              const toIndex = computeDropIndex(dragState.fromIndex, row.index, dragState.dropPosition);
              setDragState(null);
              if (toIndex !== null) {
                moveRowAtIndex(editor, dragState.fromIndex, toIndex);
              }
            }}
            onDragEnd={() => {
              setDragState(null);
            }}
            style={{
              left: cornerPosition ? `${cornerPosition.left}px` : '0px',
              top: `${row.top}px`,
              width: '20px',
              height: `${row.height}px`,
            }}
            className={`pointer-events-auto absolute flex items-center justify-center bg-dark-bg/90 hover:bg-brand-500/20 border border-white/10 hover:border-brand-500 text-dark-subtext hover:text-white rounded text-[10px] font-semibold transition-all shadow-sm active:scale-95 group cursor-grab active:cursor-grabbing ${
              isBeingDragged ? 'opacity-30 border-brand-500 bg-brand-500/30' : ''
            }`}
            title={`Linha ${row.label} • Arraste para reordenar ou clique para selecionar`}
          >
            <span>{row.label}</span>
          </button>
        );
      })}

      {/* Visual Drop Indicator for Columns (Vertical glowing line) */}
      {dropIndicatorColLeft !== null && (
        <div
          className="pointer-events-none absolute w-[2px] bg-brand-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.9)] z-30 transition-all duration-75"
          style={{
            left: `${dropIndicatorColLeft - 1}px`,
            top: cornerPosition ? `${cornerPosition.top}px` : '0px',
            height: `${tableBounds.height + 24}px`,
          }}
        />
      )}

      {/* Visual Drop Indicator for Rows (Horizontal glowing line) */}
      {dropIndicatorRowTop !== null && (
        <div
          className="pointer-events-none absolute h-[2px] bg-brand-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.9)] z-30 transition-all duration-75"
          style={{
            left: cornerPosition ? `${cornerPosition.left}px` : '0px',
            top: `${dropIndicatorRowTop - 1}px`,
            width: `${tableBounds.width + 24}px`,
          }}
        />
      )}
    </div>
  );
}

