import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const ToggleBlockComponent = (props: any) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({ title: e.target.value });
  };

  return (
    <NodeViewWrapper className="toggle-block my-1 marker:text-dark-subtext block">
      <div 
        className="flex items-center gap-1 cursor-pointer outline-none font-medium"
        contentEditable={false}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-white/10 rounded transition-colors text-dark-subtext"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <input 
          type="text"
          value={props.node.attrs.title}
          onChange={handleTitleChange}
          placeholder="Tópico..."
          className="bg-transparent outline-none flex-1 text-dark-text placeholder-white/30"
        />
      </div>
      
      {isOpen && (
        <div className="toggle-content pl-6 mt-1 text-dark-subtext border-l-2 border-white/5 ml-2">
          <NodeViewContent />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div.toggle-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'toggle-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockComponent);
  },
});
