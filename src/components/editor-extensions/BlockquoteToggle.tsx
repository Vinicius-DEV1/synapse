import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const BlockquoteToggleComponent = (props: any) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({ title: e.target.value });
  };

  return (
    <NodeViewWrapper className="blockquote-toggle block border-l-[3px] border-white/20 bg-white/5 px-4 py-3 my-4 rounded">
      <div 
        className="flex items-center gap-1 cursor-pointer outline-none font-medium italic text-white/85"
        contentEditable={false}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white/90"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <input 
          type="text"
          value={props.node.attrs.title}
          onChange={handleTitleChange}
          placeholder="Título do destaque..."
          className="bg-transparent outline-none flex-1 text-white/90 placeholder-white/40 italic"
        />
      </div>
      
      {isOpen && (
        <div className="toggle-content pl-7 mt-2 text-white/85 italic">
          <NodeViewContent />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const BlockquoteToggle = Node.create({
  name: 'blockquoteToggle',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div.blockquote-toggle' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'blockquote-toggle' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteToggleComponent);
  },
});
