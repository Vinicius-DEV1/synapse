import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  selectColumnAtIndex,
  moveColumnAtIndex,
  computeDropIndex,
} from './tableSelectionUtils';

export interface ColumnGrip {
  index: number;
  label: string;
  left: number;
  width: number;
}

export interface DragState {
  type: 'col' | 'row';
  fromIndex: number;
  targetIndex: number;
  dropPosition: 'before' | 'after';
}

interface TableColumnGripProps {
  col: ColumnGrip;
  editor: Editor | null;
  cornerPosition: { left: number; top: number } | null;
  dragState: DragState | null;
  setDragState: React.Dispatch<React.SetStateAction<DragState | null>>;
}

export function TableColumnGrip({
  col,
  editor,
  cornerPosition,
  dragState,
  setDragState,
}: TableColumnGripProps) {
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
}

export default React.memo(TableColumnGrip);
