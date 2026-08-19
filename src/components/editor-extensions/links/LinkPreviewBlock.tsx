import React, { useState, useEffect, useCallback} from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Portal } from '../../ui/Portal';
import { LINK_GROUP_SPEC } from '../group-layout/groupSpecs';
import { selectNodeForDrag } from '../group-layout/DragToGroup';
import { findChildIndex, groupWithSibling, removeChild } from '../group-layout/groupCommands';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import { fetchLinkMetadata } from './fetchLinkMetadata';
import LinkPreviewCard from './LinkPreviewCard';
import type { LinkPreviewAttrs } from './types';
import { triggerToast } from '../../ui/ToastContext';

declare module '../../../api/types' {
  interface ICadernoAPI {
    os?: {
      openInBrowser: (url: string) => void;
    };
  }
}

const LinkPreviewComponent = (props: any) => {
  const {
    url,
    title,
    isLoading,
    channel,
    duration,
    isPlaylist,
    uploadDate,
    notes: rawNotes,
    showNotes: rawShowNotes,
  } = props.node.attrs as LinkPreviewAttrs;

  const notes = rawNotes || '';
  const showNotes = !!rawShowNotes;

  const [fetchedTitle, setFetchedTitle] = useState<string | null>(title);
  const [fetchedChannel, setFetchedChannel] = useState<string | null>(channel);
  const [fetchedDuration, setFetchedDuration] = useState<number | null>(duration);
  const [fetchedIsPlaylist, setFetchedIsPlaylist] = useState<boolean>(isPlaylist);
  const [fetchedUploadDate, setFetchedUploadDate] = useState<string | null>(uploadDate);
  const [loading, setLoading] = useState(isLoading);
  const [isReloading, setIsReloading] = useState(false);
  const [showLinkConfirm, setShowLinkConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentPos = useCallback((): number | null => {
    if (typeof props.getPos !== 'function') return null;
    const pos = props.getPos();
    return typeof pos === 'number' && Number.isFinite(pos) ? pos : null;
  }, [props]);

  const groupInfo = (() => {
    const pos = currentPos();
    if (pos === null || !props.editor?.state?.doc) return null;
    return findChildIndex(props.editor.state.doc, pos);
  })();

  const isInsideGroup = !!groupInfo;

  // Selecionar a si mesmo é o que faz o arrasto remover ESTE card, e não outro
  // — ver `selectNodeForDrag`, que confere a posição antes de mexer na seleção.
  const handleSelectSelf = useCallback(() => {
    const pos = currentPos();
    if (pos === null || !props.editor) return;
    selectNodeForDrag(props.editor.view, pos, props.node);
  }, [currentPos, props.editor, props.node]);

  const handleUngroupSelf = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (!groupInfo || !props.editor) return;
      removeChild(props.editor.view, groupInfo.groupPos, groupInfo.index);
    } catch (err) {
      console.error('[LinkPreview] Falha ao desagrupar link:', err);
      triggerToast('Não foi possível desagrupar o card de link.', 'error');
    }
  };

  const handleGroupWithNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const pos = currentPos();
      if (pos === null || !props.editor) return;
      groupWithSibling(props.editor.view, LINK_GROUP_SPEC, pos);
    } catch (err) {
      console.error('[LinkPreview] Falha ao agrupar link:', err);
      triggerToast('Não foi possível agrupar os cards de link.', 'error');
    }
  };

  const handleToggleNotes = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    props.updateAttributes({ showNotes: !showNotes });
  };

  const handleChangeNotes = (nextNotes: string) => {
    props.updateAttributes({ notes: nextNotes });
  };

  useEffect(() => {
    setFetchedTitle(title);
    setFetchedChannel(channel);
    setFetchedDuration(duration);
    setFetchedIsPlaylist(isPlaylist);
    setFetchedUploadDate(uploadDate);
    setLoading(isLoading);
  }, [url, title, channel, duration, isPlaylist, uploadDate, isLoading]);

  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.url === url) {
        setShowDeleteConfirm(true);
      }
    };
    window.addEventListener('link-widget-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('link-widget-delete-request', handleDeleteRequest);
  }, [url]);

  const fetchTitle = useCallback(
    async (forceReload = false) => {
      if (!forceReload && (fetchedTitle || !loading)) return;

      setIsReloading(true);
      try {
        const metadata = await fetchLinkMetadata(url);
        setFetchedTitle(metadata.title || null);
        if (metadata.channel) setFetchedChannel(metadata.channel);
        if (metadata.duration) setFetchedDuration(metadata.duration);
        if (metadata.isPlaylist !== undefined) setFetchedIsPlaylist(metadata.isPlaylist);
        if (metadata.uploadDate) setFetchedUploadDate(metadata.uploadDate);

        props.updateAttributes({
          title: metadata.title || null,
          isLoading: false,
          channel: metadata.channel || null,
          duration: metadata.duration || null,
          isPlaylist: !!metadata.isPlaylist,
          uploadDate: metadata.uploadDate || null,
        });
        setLoading(false);
      } catch (err) {
        console.error('[LinkPreview] Falha ao carregar metadados:', err);
        try {
          const fallback = new URL(url).hostname;
          setFetchedTitle(fallback);
          props.updateAttributes({ title: fallback, isLoading: false });
        } catch {
          props.updateAttributes({ title: url, isLoading: false });
        }
        setLoading(false);
      } finally {
        setIsReloading(false);
      }
    },
    [fetchedTitle, loading, url, props]
  );

  useEffect(() => {
    fetchTitle();
  }, [fetchTitle]);

  const handleReload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFetchedTitle(null);
    setLoading(true);
    fetchTitle(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  return (
    <NodeViewWrapper
      className={`link-preview-block group/widget ${isInsideGroup ? 'my-0 h-full w-full' : 'block my-4 w-full'}`}
      contentEditable={false}
    >
      <LinkPreviewCard
        url={url}
        title={fetchedTitle}
        channel={fetchedChannel}
        duration={fetchedDuration}
        isPlaylist={fetchedIsPlaylist}
        uploadDate={fetchedUploadDate}
        notes={notes}
        showNotes={showNotes}
        loading={loading}
        isReloading={isReloading}
        selected={!!(props.selected && props.editor?.state?.selection instanceof NodeSelection && props.editor.state.selection.from === currentPos())}
        isInsideGroup={isInsideGroup}
        onOpenConfirm={() => setShowLinkConfirm(true)}
        onToggleNotes={handleToggleNotes}
        onChangeNotes={handleChangeNotes}
        onReload={handleReload}
        onDelete={handleDelete}
        onUngroup={handleUngroupSelf}
        onGroupWithNext={handleGroupWithNext}
        onDragStartHandle={handleSelectSelf}
        onMoveUp={() => {
          const pos = currentPos();
          if (pos !== null && props.editor) moveBlockUp(props.editor.view, pos);
        }}
        onMoveDown={() => {
          const pos = currentPos();
          if (pos !== null && props.editor) moveBlockDown(props.editor.view, pos);
        }}
      />

      {showLinkConfirm && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowLinkConfirm(false)}
          >
            <div
              className="bg-dark-card border border-white/10 rounded-2xl p-6 w-[400px] shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Abrir Link Externo</h3>
              <p className="text-dark-subtext text-sm mb-4">
                Deseja abrir o seguinte link no seu navegador padrão?
              </p>
              <div className="bg-black/30 border border-white/5 p-3 rounded-lg mb-6 overflow-hidden">
                <p className="text-brand-400 text-xs break-all">{url}</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLinkConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowLinkConfirm(false);
                    if (window.api?.os?.openInBrowser) {
                      window.api.os.openInBrowser(url);
                    } else {
                      window.open(url, '_blank');
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                >
                  Abrir Link
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showDeleteConfirm && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-dark-card border border-red-500/20 rounded-2xl p-6 w-[360px] shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Remover Link</h3>
              <p className="text-dark-subtext text-sm mb-6">
                Deseja realmente remover este card de link do documento?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    props.deleteNode();
                  }}
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

export const LinkPreviewBlock = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const url = selection.node.attrs.url;
          window.dispatchEvent(new CustomEvent('link-widget-delete-request', { detail: { url } }));
          return true;
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const url = selection.node.attrs.url;
          window.dispatchEvent(new CustomEvent('link-widget-delete-request', { detail: { url } }));
          return true;
        }
        return false;
      },
    };
  },

  addAttributes() {
    const booleanAttr = (name: string, defaultValue: boolean) => ({
      default: defaultValue,
      parseHTML: (element: HTMLElement) => element.getAttribute(name) === 'true',
      renderHTML: (attributes: Record<string, any>) => ({ [name]: attributes[name] ? 'true' : 'false' }),
    });

    const numberAttr = (name: string, defaultValue: number | null) => ({
      default: defaultValue,
      parseHTML: (element: HTMLElement) => {
        const raw = element.getAttribute(name);
        const parsed = raw === null ? NaN : Number(raw);
        return Number.isFinite(parsed) ? parsed : defaultValue;
      },
      renderHTML: (attributes: Record<string, any>) =>
        attributes[name] == null ? {} : { [name]: String(attributes[name]) },
    });

    return {
      url: { default: '' },
      title: { default: null },
      channel: { default: null },
      uploadDate: { default: null },
      notes: { default: '' },
      duration: numberAttr('duration', null),
      width: numberAttr('width', 50),
      isLoading: booleanAttr('isLoading', true),
      isPlaylist: booleanAttr('isPlaylist', false),
      showNotes: booleanAttr('showNotes', false),
    };
  },

  parseHTML() {
    return [{ tag: 'div.link-preview-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'link-preview-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkPreviewComponent, {
      attrs: ({ node }) => ({
        'data-group-child': '',
        style: `--group-flex: ${Number(node.attrs.width) || 50};`,
      }),
    });
  },
});
