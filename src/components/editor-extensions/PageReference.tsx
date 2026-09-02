import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { getStoreState, StoreContext } from '../../store/useStore';
import { useEffect, useState, useContext } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Portal } from '../ui/Portal';

const PageReferenceComponent = (props: any) => {
  const { pageId, title } = props.node.attrs;
  const { deleteNode } = props;
  const store = useContext(StoreContext);
  const pages = store?.state?.pages ?? getStoreState().pages;
  const targetPage = pages.find((p: any) => p.id === pageId);
  const isDeleted = !targetPage || Boolean(targetPage.deleted_at);

  const [pageTitle, setPageTitle] = useState(targetPage?.title || title || 'Página');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeletedNotice, setShowDeletedNotice] = useState(false);

  useEffect(() => {
    if (targetPage && targetPage.title) {
      setPageTitle(targetPage.title);
    }
  }, [targetPage?.title]);

  useEffect(() => {
    const handlePageUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === pageId && detail?.title) {
        setPageTitle(detail.title);
      }
    };
    window.addEventListener('caderno-page-updated', handlePageUpdate);
    return () => window.removeEventListener('caderno-page-updated', handlePageUpdate);
  }, [pageId]);

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleted) {
      setShowDeletedNotice(true);
    } else {
      window.dispatchEvent(new CustomEvent('open-floating-page', { detail: { pageId } }));
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline-block relative group mx-1 align-middle">
      <span
        onClick={handleClick}
        contentEditable={false}
        data-page-id={pageId}
        title={isDeleted ? 'Página excluída ou movida para a lixeira. Clique para opções.' : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 10px 2px 7px',
          borderRadius: '8px',
          border: isDeleted ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.12)',
          background: isDeleted ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
          fontSize: '0.875em',
          fontWeight: 500,
          color: isDeleted ? 'rgba(248,113,113,1)' : 'rgba(255,255,255,0.75)',
          userSelect: 'none',
          transition: 'border-color 0.15s, background 0.15s, color 0.15s',
          verticalAlign: 'middle',
          lineHeight: '1.6',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          if (isDeleted) {
            el.style.borderColor = 'rgba(239,68,68,0.8)';
            el.style.background = 'rgba(239,68,68,0.18)';
            el.style.color = 'rgba(254,202,202,1)';
          } else {
            el.style.borderColor = 'rgba(139,92,246,0.5)';
            el.style.background = 'rgba(139,92,246,0.08)';
            el.style.color = 'rgba(167,139,250,1)';
          }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          if (isDeleted) {
            el.style.borderColor = 'rgba(239,68,68,0.4)';
            el.style.background = 'rgba(239,68,68,0.08)';
            el.style.color = 'rgba(248,113,113,1)';
          } else {
            el.style.borderColor = 'rgba(255,255,255,0.12)';
            el.style.background = 'rgba(255,255,255,0.04)';
            el.style.color = 'rgba(255,255,255,0.75)';
          }
        }}
      >
        {isDeleted ? (
          <AlertCircle size={13} style={{ color: 'rgba(239,68,68,0.9)', flexShrink: 0 }} />
        ) : (
          <FileText size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
        )}
        <span>{pageTitle || 'Página'}{isDeleted ? ' (Excluída)' : ''}</span>
      </span>

      {showDeletedNotice && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
            <div className="bg-dark-card border border-red-500/30 rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base leading-tight">Página Excluída</h3>
                  <p className="text-dark-subtext text-xs mt-0.5">Link quebrado ou item na lixeira</p>
                </div>
              </div>
              
              <p className="text-dark-subtext text-sm leading-relaxed">
                A página <strong className="text-white">"{pageTitle}"</strong> foi movida para a lixeira ou não existe mais. Deseja remover este widget do documento?
              </p>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setShowDeletedNotice(false)}
                  className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 hover:text-white transition-colors text-sm"
                >
                  Manter
                </button>
                <button
                  onClick={() => { setShowDeletedNotice(false); deleteNode(); }}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm shadow-lg shadow-red-500/20"
                >
                  Remover Widget
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
            <div className="bg-dark-card border border-white/10 rounded-xl p-5 w-[300px] shadow-2xl flex flex-col gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
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
        </Portal>
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

        if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
          const pageId = selection.node.attrs.pageId;
          window.dispatchEvent(new CustomEvent('page-reference-delete-request', { detail: { pageId } }));
          return true;
        }

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
