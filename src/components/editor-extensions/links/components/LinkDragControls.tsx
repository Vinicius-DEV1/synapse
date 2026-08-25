import type React from 'react';
import { ArrowUp, ArrowDown, Plus, GripVertical } from 'lucide-react';

interface LinkDragControlsProps {
  onMoveUp?: (e: React.MouseEvent) => void;
  onMoveDown?: (e: React.MouseEvent) => void;
  onAddLineBelow?: (e: React.MouseEvent) => void;
  onDragStartHandle?: (e: React.MouseEvent) => void;
}

export default function LinkDragControls({
  onMoveUp,
  onMoveDown,
  onAddLineBelow,
  onDragStartHandle,
}: LinkDragControlsProps) {
  return (
    <div
      contentEditable={false}
      className="absolute -left-7 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/link:opacity-100"
    >
      {onMoveUp && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMoveUp(e);
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Subir bloco (Mover para cima)"
        >
          <ArrowUp size={11} />
        </button>
      )}
      {onAddLineBelow && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddLineBelow(e);
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Adicionar linha abaixo (+)"
        >
          <Plus size={11} />
        </button>
      )}
      <div
        data-drag-handle
        onMouseDown={onDragStartHandle}
        className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
        title="Arraste para mover o card de link"
      >
        <GripVertical size={13} />
      </div>
      {onMoveDown && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMoveDown(e);
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Descer bloco (Mover para baixo)"
        >
          <ArrowDown size={11} />
        </button>
      )}
    </div>
  );
}
