import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useState } from 'react';

const GroupBlockComponent = (props: any) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({ title: e.target.value });
  };

  return (
    <NodeViewWrapper className="group-collection bg-dark-bg border border-white/10 rounded-xl my-4 overflow-hidden shadow-lg shadow-black/20 block">
      <div 
        className="group-header flex items-center gap-2 p-3 bg-dark-card border-b border-white/5 transition-colors hover:bg-white/5"
        contentEditable={false}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="toggle-group-btn p-1 hover:bg-white/10 rounded transition-colors text-brand-400 font-bold"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <Folder size={18} className="text-brand-300" />
        <input 
          type="text"
          value={props.node.attrs.title}
          onChange={handleTitleChange}
          placeholder="Nome da Coleção..."
          className="group-title font-bold outline-none flex-1 text-brand-100 bg-transparent placeholder-white/30"
        />
      </div>
      
      {isOpen && (
        <div className="group-content p-4 pl-8 border-l-2 border-white/5 ml-4">
          <NodeViewContent />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const GroupBlock = Node.create({
  name: 'groupBlock',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.group-collection',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'group-collection' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GroupBlockComponent);
  },
});
