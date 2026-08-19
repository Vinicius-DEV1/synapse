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
      <div
        contentEditable={false}
        className="absolute -left-7 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/divider:opacity-100"
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function' && props.editor) {
              const pos = props.getPos();
              if (typeof pos === 'number') moveBlockUp(props.editor.view, pos);
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
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
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Adicionar linha abaixo (+)"
        >
          <Plus size={11} />
        </button>
        <div 
          data-drag-handle
          onMouseDown={handleDragMouseDown}
          className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
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
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
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
