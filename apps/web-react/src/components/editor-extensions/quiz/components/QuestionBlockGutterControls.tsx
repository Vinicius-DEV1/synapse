import React from 'react';
import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { GripVertical, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { selectNodeForDrag } from '../../group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from '../../moveBlockCommands';

interface QuestionBlockGutterControlsProps {
  editor: Editor;
  getPos: (() => number | undefined) | boolean;
  node: ProseMirrorNode;
}

export const QuestionBlockGutterControls = React.memo(function QuestionBlockGutterControls({
  editor,
  getPos,
  node,
}: QuestionBlockGutterControlsProps) {
  const handleDragMouseDown = () => {
    if (typeof getPos === 'function' && editor?.view) {
      const p = getPos();
      if (typeof p === 'number') {
        selectNodeForDrag(editor.view, p, node);
      }
    }
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof getPos === 'function' && editor) {
      const p = getPos();
      if (typeof p === 'number') moveBlockUp(editor.view, p);
    }
  };

  const handleAddLineBelow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof getPos === 'function' && editor) {
      const p = getPos();
      if (typeof p === 'number') {
        editor.chain().focus().insertContentAt(p + node.nodeSize, { type: 'paragraph' }).run();
      }
    }
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof getPos === 'function' && editor) {
      const p = getPos();
      if (typeof p === 'number') moveBlockDown(editor.view, p);
    }
  };

  return (
    <div
      contentEditable={false}
      className="absolute -left-7 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/quiz:opacity-100"
    >
      <button
        onClick={handleMoveUp}
        className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        title="Subir bloco de questões (Mover para cima)"
      >
        <ArrowUp size={11} />
      </button>
      <button
        onClick={handleAddLineBelow}
        className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        title="Adicionar linha abaixo (+)"
      >
        <Plus size={11} />
      </button>
      <div
        data-drag-handle
        onMouseDown={handleDragMouseDown}
        className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
        title="Arrastar bloco de questões"
      >
        <GripVertical size={13} />
      </div>
      <button
        onClick={handleMoveDown}
        className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        title="Descer bloco de questões (Mover para baixo)"
      >
        <ArrowDown size={11} />
      </button>
    </div>
  );
});
