import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  selectRowAtIndex,
  moveRowAtIndex,
  computeDropIndex,
} from './tableSelectionUtils';
import type { DragState } from './TableColumnGrip';

export interface RowGrip {
  index: number;
  label: string;
  top: number;
  height: number;
}

interface TableTableRowGripProps {
  row: RowGrip;
  editor: Editor | null;
  cornerPosition: { left: number; top: number } | null;
  dragState: DragState | null;
  setDragState: React.Dispatch<React.SetStateAction<DragState | null>>;
}

export function TableRowGrip({
  row,
  editor,
  cornerPosition,
  dragState,
  setDragState,
}: TableTableRowGripProps) {
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
}

export default React.memo(TableRowGrip);
