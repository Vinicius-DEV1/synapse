import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useStore } from '../../store/useStore';
import { useEffect, useState } from 'react';

const PageReferenceComponent = (props: any) => {
  const { pageId, title } = props.node.attrs;
  const { state } = useStore();
  const [pageTitle, setPageTitle] = useState(title);

  useEffect(() => {
    if (pageId) {
      const page = state.pages.find(p => p.id === pageId);
      if (page && page.title) {
        setPageTitle(page.title);
      }
    }
  }, [pageId, state.pages]);

  const handleClick = () => {
    // Dispatch um evento global para abrir o modal flutuante
    window.dispatchEvent(new CustomEvent('open-floating-page', { detail: { pageId } }));
  };

  return (
    <NodeViewWrapper as="span" className="inline-block mx-1 align-baseline">
      <span 
        onClick={handleClick}
        className="page-reference inline-flex items-center gap-1.5 bg-brand-500/5 hover:bg-brand-500/15 text-brand-300 px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-200 text-[1.05em] border border-brand-500/30 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-0.5"
        data-page-id={pageId}
        contentEditable={false}
      >
        <span className="text-brand-400 text-sm">📄</span>
        <span className="page-name font-medium border-l border-brand-500/20 pl-2">{pageTitle}</span>
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
