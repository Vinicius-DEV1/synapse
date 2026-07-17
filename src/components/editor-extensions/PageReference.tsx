import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

const PageReferenceComponent = (props: any) => {
  const { pageId, title } = props.node.attrs;

  const handleClick = () => {
    // Dispatch um evento global para abrir o modal flutuante
    window.dispatchEvent(new CustomEvent('open-floating-page', { detail: { pageId } }));
  };

  return (
    <NodeViewWrapper as="span" className="inline-block">
      <span 
        onClick={handleClick}
        className="page-reference inline-flex items-center bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
        data-page-id={pageId}
        contentEditable={false}
      >
        <span className="page-name font-medium">📄 {title}</span>
      </span>
    </NodeViewWrapper>
  );
};

export const PageReference = Node.create({
  name: 'pageReference',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: 'Página' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-page-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'page-reference' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageReferenceComponent);
  },
});
