import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { useStore } from '../../store/useStore';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

const PageReferenceComponent = (props: any) => {
  const { pageId, title } = props.node.attrs;
  const { deleteNode } = props;
  const { state } = useStore();
  const [pageTitle, setPageTitle] = useState(title);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (pageId) {
      const page = state.pages.find(p => p.id === pageId);
      if (page && page.title) {
        setPageTitle(page.title);
      }
    }
  }, [pageId, state.pages]);

  // Escuta evento de delete via teclado (Backspace/Delete) para confirmar remoção
  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.pageId === pageId) {
        setShowConfirm(true);
      }
    };
    window.addEventListener('page-reference-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('page-reference-delete-request', handleDeleteRequest);
  }, [pageId]);

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

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
          <div className="bg-dark-card border border-white/10 rounded-xl p-5 w-[300px] shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-base text-center">Remover Referência</h3>
            <p className="text-dark-subtext text-sm text-center">
              Deseja remover a referência para "{pageTitle}" desta página?
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowConfirm(false); deleteNode(); }}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
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
      pageId: { 
        default: null,
        parseHTML: element => element.getAttribute('data-page-id'),
        renderHTML: attributes => {
          if (!attributes.pageId) {
            return {};
          }
          return { 'data-page-id': attributes.pageId };
        }
      },
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

  addKeyboardShortcuts() {
    const nodeName = this.name;

    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        // Caso 1: Nó já selecionado via NodeSelection
        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const pageId = selection.node.attrs.pageId;
          window.dispatchEvent(new CustomEvent('page-reference-delete-request', { detail: { pageId } }));
          return true;
        }

        // Caso 2: Cursor logo após o atom inline
        const { $from } = selection;
        if (selection.empty && $from.nodeBefore?.type.name === nodeName) {
          const pageId = $from.nodeBefore.attrs.pageId;
          window.dispatchEvent(new CustomEvent('page-reference-delete-request', { detail: { pageId } }));
          return true;
        }

        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const pageId = selection.node.attrs.pageId;
          window.dispatchEvent(new CustomEvent('page-reference-delete-request', { detail: { pageId } }));
          return true;
        }

        const { $from } = selection;
        if (selection.empty && $from.nodeAfter?.type.name === nodeName) {
          const pageId = $from.nodeAfter.attrs.pageId;
          window.dispatchEvent(new CustomEvent('page-reference-delete-request', { detail: { pageId } }));
          return true;
        }

        return false;
      },
    };
  },
});

