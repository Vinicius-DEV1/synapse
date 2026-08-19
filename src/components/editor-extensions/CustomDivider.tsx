import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Plus, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { selectNodeForDrag } from './group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';

const DividerComponent = (props: any) => {
  const handleDragMouseDown = () => {
    if (typeof props.getPos === 'function' && props.editor?.view) {
      const pos = props.getPos();
      if (typeof pos === 'number') {
        selectNodeForDrag(props.editor.view, pos, props.node);
      }
    }
  };

  return (
    <NodeViewWrapper className="group/divider relative flex items-center w-full my-6">
      <div className="absolute -left-16 opacity-0 group-hover/divider:opacity-100 flex items-center gap-0.5 z-10 bg-dark-bg/80 backdrop-blur-md rounded-lg border border-white/10 p-0.5 shadow-xl" contentEditable={false}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function' && props.editor) {
              const pos = props.getPos();
              if (typeof pos === 'number') moveBlockUp(props.editor.view, pos);
            }
          }}
          className="cursor-pointer hover:bg-white/10 p-1 rounded text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Subir divisor (Mover para cima)"
        >
          <ArrowUp size={11} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function') {
              const pos = props.getPos();
              props.editor.chain().focus().insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' }).run();
            }
          }}
          className="cursor-pointer hover:bg-white/10 p-1 rounded text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Adicionar linha abaixo"
        >
          <Plus size={13} />
        </button>
        <div 
          data-drag-handle
          onMouseDown={handleDragMouseDown}
          className="cursor-grab active:cursor-grabbing hover:bg-white/10 p-1 rounded text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Arrastar linha divisória"
        >
          <GripVertical size={13} />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function' && props.editor) {
              const pos = props.getPos();
              if (typeof pos === 'number') moveBlockDown(props.editor.view, pos);
            }
          }}
          className="cursor-pointer hover:bg-white/10 p-1 rounded text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Descer divisor (Mover para baixo)"
        >
          <ArrowDown size={11} />
        </button>
      </div>
      <hr className={`editor-divider w-full flex-1 ${props.selected ? 'ProseMirror-selectednode' : ''}`} style={{ margin: 0 }} />
    </NodeViewWrapper>
  );
};

export const CustomDivider = HorizontalRule.extend({
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(DividerComponent);
  },
});
