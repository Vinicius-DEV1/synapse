import { mergeAttributes } from '@tiptap/core';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Plus, GripVertical } from 'lucide-react';

const DividerComponent = (props: any) => {
  return (
    <NodeViewWrapper className="group/divider relative flex items-center w-full my-6">
      <div className="absolute -left-12 opacity-0 group-hover/divider:opacity-100 flex items-center z-10 bg-dark-bg/50 backdrop-blur-sm rounded-md border border-white/5 shadow-sm" contentEditable={false}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function') {
              const pos = props.getPos();
              props.editor.chain().focus().insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' }).run();
            }
          }}
          className="cursor-pointer hover:bg-white/10 p-1 rounded-l text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Adicionar linha abaixo"
        >
          <Plus size={16} />
        </button>
        <div 
          data-drag-handle
          onMouseDown={() => {
            if (typeof props.getPos === 'function') {
              const pos = props.getPos();
              if (typeof pos === 'number') {
                props.editor.commands.setNodeSelection(pos);
              }
            }
          }}
          className="cursor-grab hover:bg-white/10 p-1 rounded-r text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
          title="Arrastar linha"
        >
          <GripVertical size={16} />
        </div>
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
