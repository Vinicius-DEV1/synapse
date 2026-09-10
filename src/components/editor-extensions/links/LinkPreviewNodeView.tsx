import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Copy, Check, FileArchive, ExternalLink, Eye } from 'lucide-react';
import { NodeSelection } from '@tiptap/pm/state';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Portal } from '../../ui/Portal';
import { LINK_GROUP_SPEC } from '../group-layout/groupSpecs';
import { selectNodeForDrag } from '../group-layout/DragToGroup';
import { findChildIndex, groupWithSibling, removeChild } from '../group-layout/groupCommands';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import { fetchLinkMetadata } from './fetchLinkMetadata';
import LinkPreviewCard from './LinkPreviewCard';
import type { LinkPreviewAttrs } from './types';
import { triggerToast } from '../../ui/ToastContext';
import { StoreContext, getNotesKey, getStoreState } from '../../../store/useStore';
import type { Action } from '../../../types';
import { encryptAndSaveScrap } from '../../../services/scrap/scrap-storage';
import { captureWebScrap } from '../../../services/scrap/scrap-service';
import { platform } from '../../../services/platform';
import { useLinkDuplicates } from './hooks/useLinkDuplicates';
import LinkDuplicatesModal from './components/LinkDuplicatesModal';
import { playUiClickSound, playUiToggleSound, playUiActionSound, playUiDeleteSound } from '../../../utils/uiSounds';

export const LinkPreviewComponent = (props: NodeViewProps) => {
  const {
    url,
    title,
    isLoading,
    channel,
    duration,
    isPlaylist,
    playlistCount,
    uploadDate,
    notes: rawNotes,
    showNotes: rawShowNotes,
    watched: rawWatched,
    color: rawColor,
    scrapId,
    scrapStatus,
    scrapLocalPath,
    scrapDriveFileId,
    scrapFileSize,
    scrapCreatedAt,
  } = props.node.attrs as LinkPreviewAttrs;

  const masterKey = getNotesKey() || getStoreState().moduleKeys['files'];

  const notes = rawNotes || '';
  const showNotes = !!rawShowNotes;
  const watched = !!rawWatched;
  const color = rawColor || 'default';

  const [fetchedTitle, setFetchedTitle] = useState<string | null>(title);
  const [fetchedChannel, setFetchedChannel] = useState<string | null>(channel);
  const [fetchedDuration, setFetchedDuration] = useState<number | null>(duration);
  const [fetchedIsPlaylist, setFetchedIsPlaylist] = useState<boolean>(isPlaylist);
  const [fetchedPlaylistCount, setFetchedPlaylistCount] = useState<number | null>(playlistCount || null);
  const [fetchedUploadDate, setFetchedUploadDate] = useState<string | null>(uploadDate);
  const [loading, setLoading] = useState(isLoading);
  const [isReloading, setIsReloading] = useState(false);
  const [showLinkConfirm, setShowLinkConfirm] = useState(false);
  const [copiedModalUrl, setCopiedModalUrl] = useState(false);
  const copyModalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const mountedRef = useRef(true);

  const storeCtx = useContext(StoreContext);
  const state = storeCtx?.state || getStoreState();
  const dispatch = storeCtx?.dispatch || ((_action: Action) => {});
  const activeTab = state?.tabs?.find((t) => t.id === state?.activeTabId);
  const currentPageId = activeTab?.pageId || null;
  const { duplicatePages } = useLinkDuplicates(url, currentPageId);

  const handleNavigateToPage = useCallback(
    (targetPageId: string) => {
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: targetPageId });
      setShowDuplicatesModal(false);
    },
    [dispatch]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyModalTimeoutRef.current) {
        clearTimeout(copyModalTimeoutRef.current);
      }
    };
  }, []);

  const handleCloseLinkConfirm = useCallback(() => {
    playUiClickSound();
    setShowLinkConfirm(false);
    setCopiedModalUrl(false);
    if (copyModalTimeoutRef.current) {
      clearTimeout(copyModalTimeoutRef.current);
    }
  }, []);

  const handleCopyModalUrl = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playUiActionSound();
    if (!url) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedModalUrl(true);
      triggerToast('Link copiado para a área de transferência!', 'info', 2000);
      if (copyModalTimeoutRef.current) clearTimeout(copyModalTimeoutRef.current);
      copyModalTimeoutRef.current = setTimeout(() => setCopiedModalUrl(false), 2000);
    } catch (err) {
      console.error('[LinkPreview] Falha ao copiar link:', err);
      triggerToast('Não foi possível copiar o link.', 'error');
    }
  }, [url]);

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

  // Selecting self ensures drag-and-drop targets THIS specific card node
  // see `selectNodeForDrag` for position validation prior to selection updates.
  const handleSelectSelf = useCallback(() => {
    const pos = currentPos();
    if (pos === null || !props.editor) return;
    selectNodeForDrag(props.editor.view, pos, props.node);
  }, [currentPos, props.editor, props.node]);

  const handleUngroupSelf = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playUiToggleSound(false);
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
    playUiToggleSound(true);
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
    playUiToggleSound(!showNotes);
    props.updateAttributes({ showNotes: !showNotes });
  };

  const handleToggleWatched = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playUiToggleSound(!watched);
    props.updateAttributes({ watched: !watched });
  };

  const handleConvertToText = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playUiClickSound();
    const pos = currentPos();
    if (pos === null || !props.editor) return;
    const urlToInsert = url;
    const nodeSize = props.node?.nodeSize || 1;
    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + nodeSize })
      .insertContentAt(pos, {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            marks: [{ type: 'link', attrs: { href: urlToInsert } }],
            text: urlToInsert,
          },
        ],
      })
      .run();
  };

  const handleChangeNotes = (nextNotes: string) => {
    props.updateAttributes({ notes: nextNotes });
  };

  useEffect(() => {
    setFetchedTitle(title);
    setFetchedChannel(channel);
    setFetchedDuration(duration);
    setFetchedIsPlaylist(isPlaylist);
    setFetchedPlaylistCount(playlistCount || null);
    setFetchedUploadDate(uploadDate);
    setLoading(isLoading);
  }, [url, title, channel, duration, isPlaylist, playlistCount, uploadDate, isLoading]);

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

  const updateAttributes = props.updateAttributes;

  const fetchTitle = useCallback(
    async (forceReload = false) => {
      if (!forceReload && (fetchedTitle || !loading)) return;
      if (!url) return;

      setIsReloading(true);
      try {
        const metadata = await fetchLinkMetadata(url);
        if (!mountedRef.current || props.editor?.isDestroyed) return;

        setFetchedTitle(metadata.title || null);
        if (metadata.channel) setFetchedChannel(metadata.channel);
        if (metadata.duration) setFetchedDuration(metadata.duration);
        if (metadata.isPlaylist !== undefined) setFetchedIsPlaylist(metadata.isPlaylist);
        if (metadata.playlistCount !== undefined) setFetchedPlaylistCount(metadata.playlistCount);
        if (metadata.uploadDate) setFetchedUploadDate(metadata.uploadDate);

        updateAttributes?.({
          title: metadata.title || null,
          isLoading: false,
          channel: metadata.channel || null,
          duration: metadata.duration || null,
          isPlaylist: !!metadata.isPlaylist,
          playlistCount: metadata.playlistCount || null,
          uploadDate: metadata.uploadDate || null,
        });
        setLoading(false);
      } catch (err) {
        if (!mountedRef.current || props.editor?.isDestroyed) return;
        console.error('[LinkPreview] Falha ao carregar metadados:', err);
        try {
          const fallback = new URL(url).hostname;
          setFetchedTitle(fallback);
          updateAttributes?.({ title: fallback, isLoading: false });
        } catch {
          updateAttributes?.({ title: url, isLoading: false });
        }
        setLoading(false);
      } finally {
        if (mountedRef.current) {
          setIsReloading(false);
        }
      }
    },
    [fetchedTitle, loading, url, updateAttributes, props.editor]
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

  const handleCaptureScrap = useCallback(async () => {
    playUiClickSound();
    if (!url) return;
    props.updateAttributes({ scrapStatus: 'capturing' });

    try {
      if (platform.platform === 'desktop') {
        const payload = await captureWebScrap(url);
        const saveResult = await encryptAndSaveScrap(
          payload.id,
          payload.html_content,
          payload.local_path,
          masterKey
        );

        props.updateAttributes({
          scrapId: payload.id,
          scrapLocalPath: payload.local_path,
          scrapDriveFileId: saveResult.driveFileId,
          scrapFileSize: payload.file_size,
          scrapStatus: saveResult.isSynced ? 'ready' : 'sync_pending',
          scrapCreatedAt: payload.created_at || new Date().toISOString(),
        });
        triggerToast('Snapshot offline salvo com sucesso!', 'info', 3000);
      } else {
        props.updateAttributes({ scrapStatus: 'error' });
        triggerToast('A captura completa de páginas está disponível no app Desktop.', 'error');
      }
    } catch (err: unknown) {
      console.error('[LinkPreview] Erro na captura de scrap:', err);
      props.updateAttributes({ scrapStatus: 'error' });
      const msg = err instanceof Error ? err.message : String(err) || 'Falha ao salvar página offline.';
      triggerToast(msg, 'error');
    }
  }, [url, masterKey, props]);

  const handleOpenScrap = useCallback(() => {
    if (!scrapId) return;
    window.dispatchEvent(
      new CustomEvent('caderno-open-scrap-action', {
        detail: {
          scrapId,
          url,
          title: fetchedTitle || title || url,
          driveFileId: scrapDriveFileId,
          localPath: scrapLocalPath,
          fileSize: scrapFileSize,
          createdAt: scrapCreatedAt,
          status: scrapStatus,
        },
      })
    );
  }, [scrapId, url, fetchedTitle, title, scrapDriveFileId, scrapLocalPath, scrapFileSize, scrapCreatedAt, scrapStatus]);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playUiClickSound();
    setShowDeleteConfirm(true);
  };

  const hasScrap = Boolean(scrapId && (scrapStatus === 'ready' || scrapStatus === 'sync_pending'));

  return (
    <NodeViewWrapper
      className={`link-preview-block group/widget ${
        isInsideGroup ? 'my-0 h-full w-full' : 'block my-4 w-full'
      }`}
      contentEditable={false}
    >
      <LinkPreviewCard
        url={url}
        title={fetchedTitle}
        channel={fetchedChannel}
        duration={fetchedDuration}
        isPlaylist={fetchedIsPlaylist}
        playlistCount={fetchedPlaylistCount}
        uploadDate={fetchedUploadDate}
        notes={notes}
        showNotes={showNotes}
        watched={watched}
        color={color}
        loading={loading}
        isReloading={isReloading}
        selected={
          !!(
            props.selected &&
            props.editor?.state?.selection instanceof NodeSelection &&
            props.editor.state.selection.from === currentPos()
          )
        }
        isInsideGroup={isInsideGroup}
        onChangeColor={(newColor: string) => {
          playUiClickSound();
          props.updateAttributes({ color: newColor })
        }}
        onOpenConfirm={() => {
          playUiClickSound();
          setShowLinkConfirm(true);
        }}
        onToggleNotes={handleToggleNotes}
        onToggleWatched={handleToggleWatched}
        onConvertToText={handleConvertToText}
        onChangeNotes={handleChangeNotes}
        onReload={handleReload}
        onDelete={handleDelete}
        onUngroup={handleUngroupSelf}
        onGroupWithNext={handleGroupWithNext}
        onDragStartHandle={handleSelectSelf}
        duplicatePages={duplicatePages}
        onOpenDuplicates={() => {
          playUiClickSound();
          setShowDuplicatesModal(true);
        }}
        scrapId={scrapId}
        scrapStatus={scrapStatus}
        onCaptureScrap={handleCaptureScrap}
        onOpenScrap={handleOpenScrap}
        onMoveUp={() => {
          playUiClickSound();
          const pos = currentPos();
          if (pos !== null && props.editor) moveBlockUp(props.editor.view, pos);
        }}
        onMoveDown={() => {
          playUiClickSound();
          const pos = currentPos();
          if (pos !== null && props.editor) moveBlockDown(props.editor.view, pos);
        }}
        onAddLineBelow={() => {
          playUiClickSound();
          const pos = currentPos();
          if (pos !== null && props.editor && props.node) {
            props.editor
              .chain()
              .focus()
              .insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' })
              .run();
          }
        }}
      />

      {showLinkConfirm && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={handleCloseLinkConfirm}
          >
            <div
              className="bg-dark-card border border-white/10 rounded-2xl p-6 w-[420px] shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-lg font-bold text-white">Abrir Link Externo</h3>
                {hasScrap && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] font-medium">
                    <FileArchive size={11} />
                    <span>Snapshot Salvo</span>
                  </span>
                )}
              </div>
              <p className="text-dark-subtext text-sm mb-4">
                {hasScrap
                  ? 'Este link possui uma cópia offline salva. Como deseja acessá-lo?'
                  : 'Deseja abrir o seguinte link no seu navegador padrão?'}
              </p>
              <div
                onClick={handleCopyModalUrl}
                className="group relative bg-black/30 hover:bg-black/50 border border-white/5 hover:border-brand-500/30 p-3 rounded-xl mb-6 flex items-center justify-between gap-2.5 cursor-pointer transition-all"
                title="Clique para copiar o link"
              >
                <p className="text-brand-400 text-xs break-all select-all flex-1 font-mono">
                  {url}
                </p>
                <button
                  type="button"
                  onClick={handleCopyModalUrl}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    copiedModalUrl
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-dark-subtext group-hover:text-white group-hover:bg-white/10'
                  }`}
                  title={copiedModalUrl ? 'Link copiado!' : 'Copiar link'}
                >
                  {copiedModalUrl ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-[11px] text-emerald-400 font-medium">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span className="text-[11px] font-medium">Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseLinkConfirm}
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                {hasScrap ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        playUiClickSound();
                        handleCloseLinkConfirm();
                        handleOpenScrap();
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye size={15} />
                      <span>Ver Snapshot Offline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playUiClickSound();
                        handleCloseLinkConfirm();
                        if (window.api?.os?.openInBrowser) {
                          window.api.os.openInBrowser(url);
                        } else {
                          window.open(url, '_blank');
                        }
                      }}
                      className="px-3.5 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/15 text-white transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} />
                      <span>Abrir no Navegador</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playUiClickSound();
                      handleCloseLinkConfirm();
                      if (window.api?.os?.openInBrowser) {
                        window.api.os.openInBrowser(url);
                      } else {
                        window.open(url, '_blank');
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    <span>Abrir no Navegador</span>
                  </button>
                )}
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
                  onClick={() => {
                    playUiClickSound();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    playUiDeleteSound();
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

      <LinkDuplicatesModal
        isOpen={showDuplicatesModal}
        onClose={() => setShowDuplicatesModal(false)}
        url={url}
        title={fetchedTitle || title}
        duplicatePages={duplicatePages}
        onNavigateToPage={handleNavigateToPage}
      />
    </NodeViewWrapper>
  );
};
