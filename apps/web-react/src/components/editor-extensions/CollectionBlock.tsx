import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';

const CollectionBlockComponent = (props: any) => {
  const isOpen = props.node.attrs.collapsed !== true;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({ title: e.target.value });
  };

  const handleToggleOpen = () => {
    props.updateAttributes({ collapsed: isOpen });
  };

  return (
    <NodeViewWrapper className="group-collection bg-dark-bg border border-white/10 rounded-xl my-4 overflow-hidden shadow-lg shadow-black/20 block">
      <div 
        className="group-header flex items-center gap-2 p-3 bg-dark-card border-b border-white/5 transition-colors hover:bg-white/5"
        contentEditable={false}
      >
        <button 
          onClick={handleToggleOpen}
          className="toggle-group-btn p-1 hover:bg-white/10 rounded transition-colors text-brand-400 font-bold"
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <Folder size={18} className="text-brand-300" />
        <input 
          type="text"
          value={props.node.attrs.title || ''}
          onChange={handleTitleChange}
          placeholder="Nome da Coleção..."
          className="group-title font-bold outline-none flex-1 text-brand-100 bg-transparent placeholder-white/30"
        />
      </div>
      
      <div className={isOpen ? 'group-content p-4 pl-8 border-l-2 border-white/5 ml-4' : 'hidden'}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};

export const CollectionBlock = Node.create({
  name: 'groupBlock',
  group: 'block',
  content: 'block+',
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') || element.getAttribute('title') || '',
        renderHTML: (attributes) => ({
          title: attributes.title || '',
          'data-title': attributes.title || '',
        }),
      },
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => ({
          'data-collapsed': attributes.collapsed ? 'true' : 'false',
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.group-collection, div[data-type="groupBlock"], div[data-type="collectionBlock"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'group-collection',
        'data-type': 'groupBlock',
        title: node.attrs.title || HTMLAttributes['data-title'] || '',
        'data-title': node.attrs.title || HTMLAttributes['data-title'] || '',
        'data-collapsed': node.attrs.collapsed ? 'true' : 'false',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollectionBlockComponent);
  },
});
