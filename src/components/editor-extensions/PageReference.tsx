import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useStore } from '../../store/useStore';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

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
    window.dispatchEvent(new CustomEvent('open-floating-page', { detail: { pageId } }));
  };

  return (
    <NodeViewWrapper as="span" className="inline-block mx-1 align-middle">
      <span
        onClick={handleClick}
        contentEditable={false}
        data-page-id={pageId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 10px 2px 7px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
          fontSize: '0.875em',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.75)',
          userSelect: 'none',
          transition: 'border-color 0.15s, background 0.15s, color 0.15s',
          verticalAlign: 'middle',
          lineHeight: '1.6',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'rgba(139,92,246,0.5)';
          el.style.background = 'rgba(139,92,246,0.08)';
          el.style.color = 'rgba(167,139,250,1)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'rgba(255,255,255,0.12)';
          el.style.background = 'rgba(255,255,255,0.04)';
          el.style.color = 'rgba(255,255,255,0.75)';
        }}
      >
        <FileText size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
        <span>{pageTitle || 'Página'}</span>
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
