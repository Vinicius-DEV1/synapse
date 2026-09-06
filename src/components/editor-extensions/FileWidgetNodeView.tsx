import { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { File, FileText, Image as ImageIcon, Film, X, Folder, ArrowUp, ArrowDown, Palette, AlertCircle, Pencil, Check } from 'lucide-react';
import { getStoreState, getStoreDispatch } from '../../store/useStore';
import { getValidAccessToken, deleteFromDrive } from '../../services/drive';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';
import FileViewer from '../files/FileViewer';
import FloatingPdfViewer from './FloatingPdfViewer';
import ColorPalettePicker from './ColorPalettePicker';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';
import type { FileItem } from '../../types/files';
import AudioPlayerModal from '../files/AudioPlayerModal';

export default function FileWidgetNodeView(props: any) {
  const { node, deleteNode, updateAttributes } = props;
  const { fileId, name, fileType, isLink, color: rawColor } = node.attrs;
  const color = rawColor || 'default';
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletedNotice, setShowDeletedNotice] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [fileItem, setFileItem] = useState<FileItem | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const paletteButtonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  const loadFile = (isBackground = false) => {
    if (window.api?.files && fileId) {
      const currentReqId = ++reqIdRef.current;
      if (!isBackground) {
        setIsLoadingFile(true);
      }
      window.api.files.getById(fileId)
        .then((item: FileItem | null) => {
          if (!mountedRef.current || currentReqId !== reqIdRef.current) return;
          setFileItem((prev) => {
            if (!item && !prev) return null;
            if (
              prev &&
              item &&
              prev.id === item.id &&
              prev.updated_at === item.updated_at &&
              prev.local_path === item.local_path &&
              prev.name === item.name
            ) {
              return prev; // Preserve reference identity to prevent downstream re-renders
            }
            return item || null;
          });
        })
        .catch((err: unknown) => {
          if (!mountedRef.current || currentReqId !== reqIdRef.current) return;
          console.error('[FileWidgetNodeView] Failed to load file info:', err);
          setFileItem(null);
        })
        .finally(() => {
          if (mountedRef.current && currentReqId === reqIdRef.current && !isBackground) {
            setIsLoadingFile(false);
          }
        });
    } else {
      if (mountedRef.current) {
        setIsLoadingFile(false);
      }
    }
  };

  useEffect(() => {
    loadFile(false);

    const handleSync = () => {
      loadFile(true);
    };
    window.addEventListener('app-sync-trigger', handleSync);
    window.addEventListener('caderno-sync-complete', handleSync);
    window.addEventListener('caderno-file-updated', handleSync);
    return () => {
      window.removeEventListener('app-sync-trigger', handleSync);
      window.removeEventListener('caderno-sync-complete', handleSync);
      window.removeEventListener('caderno-file-updated', handleSync);
    };
  }, [fileId]);

  // Listen for keyboard delete event (Backspace/Delete) to show confirmation modal
  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.fileId === fileId) {
        setShowDeleteConfirm(true);
      }
    };
    window.addEventListener('file-widget-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('file-widget-delete-request', handleDeleteRequest);
  }, [fileId]);

  useEffect(() => {
    const handleOpenQuickViewer = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.fileId === fileId) {
        setShowViewer(true);
      }
    };
    window.addEventListener('open-quick-viewer', handleOpenQuickViewer);
    return () => window.removeEventListener('open-quick-viewer', handleOpenQuickViewer);
  }, [fileId]);

  const isNotFound = !isLoadingFile && fileItem === null;

  const getIcon = () => {
    if (isNotFound) {
      return <AlertCircle size={16} className="text-red-400" />;
    }
    switch(fileType) {
      case 'pdf': return <FileText size={16} className="text-blue-400" />;
      case 'image': return <ImageIcon size={16} className="text-green-400" />;
      case 'video': return <Film size={16} className="text-purple-400" />;
      case 'folder': return <Folder size={16} className="text-yellow-400" />;
      default: return <File size={16} className="text-brand-400" />;
    }
  };

  const handleStartRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isNotFound) return;
    const currentName = name || fileItem?.name || 'Arquivo';
    setRenameValue(currentName);
    setIsRenaming(true);
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      const dotIndex = renameValue.lastIndexOf('.');
      if (dotIndex > 0) {
        renameInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [isRenaming]);

  const handleSaveRename = async (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const trimmed = renameValue.trim();
    const currentName = name || fileItem?.name || 'Arquivo';

    if (!trimmed || trimmed === currentName) {
      setIsRenaming(false);
      return;
    }

    setIsSavingRename(true);
    try {
      if (window.api?.files && fileId) {
        const itemToUpdate = fileItem || (await window.api.files.getById(fileId).catch(() => null));
        if (itemToUpdate) {
          await window.api.files.update({
            ...itemToUpdate,
            name: trimmed,
          });
          setFileItem((prev: any) => (prev ? { ...prev, name: trimmed } : prev));
        }
      }

      updateAttributes?.({ name: trimmed });

      if (props.editor && fileId) {
        const tr = props.editor.state.tr;
        let modified = false;
        props.editor.state.doc.descendants((docNode: any, docPos: number) => {
          if (
            docNode.type.name === 'fileWidget' &&
            docNode.attrs.fileId === fileId &&
            docNode.attrs.name !== trimmed
          ) {
            tr.setNodeMarkup(docPos, undefined, {
              ...docNode.attrs,
              name: trimmed,
            });
            modified = true;
          }
        });
        if (modified) {
          props.editor.view.dispatch(tr);
        }
      }

      window.dispatchEvent(
        new CustomEvent('caderno-file-updated', {
          detail: { fileId, newName: trimmed },
        })
      );
      window.dispatchEvent(new CustomEvent('app-sync-trigger'));

      triggerToast('Arquivo renomeado com sucesso.', 'success');
      setIsRenaming(false);
    } catch (err: unknown) {
      console.error('[FileWidgetNodeView] Rename failed:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao renomear arquivo.';
      triggerToast(msg, 'error');
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleCancelRename = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setIsRenaming(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (fileItem && window.api.files) {
        // Remove from DB
        await window.api.files.delete(fileItem.id);
        
        // No 'keep in Drive' option in UI - the 'Delete All' button
        // always removes from Drive as well when drive_file_id exists.
        if (fileItem.drive_file_id) {
          try {
            const token = await getValidAccessToken();
            if (token) {
              await deleteFromDrive(token, fileItem.drive_file_id);
            }
          } catch (e) {
            console.warn("Failed to delete from Drive", e);
          }
        }
      }
      deleteNode();
      triggerToast('Arquivo excluído com sucesso.', 'info');
    } catch (e: unknown) {
      console.error("Delete failed", e);
      const msg = e instanceof Error ? e.message : "Falha ao excluir arquivo do sistema.";
      triggerToast(msg, "error");
    } finally {
      if (mountedRef.current) {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    }
  };

  const isCustomColor = Boolean(color && color !== 'default') && !isNotFound;
  const customWidgetStyle: React.CSSProperties = isNotFound
    ? {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: isNodeSelected ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.4)',
        boxShadow: isNodeSelected
          ? '0 0 0 2px rgba(239, 68, 68, 0.5), 0 0 12px rgba(239, 68, 68, 0.2)'
          : undefined,
      }
    : isCustomColor
    ? {
        backgroundColor: `${color}18`,
        borderColor: isNodeSelected ? color : `${color}60`,
        boxShadow: isNodeSelected
          ? `0 0 0 2px ${color}80, 0 0 12px ${color}30`
          : `0 0 0 1px ${color}20, 0 2px 6px ${color}10`,
      }
    : {};

  return (
    <NodeViewWrapper as="span" className="inline-block relative group align-middle mx-1 my-1">
      <div 
        onMouseDown={() => {
          if (typeof props.getPos === 'function') {
            const pos = props.getPos();
            if (typeof pos === 'number' && props.editor) {
              props.editor.commands.setNodeSelection(pos);
            }
          }
        }}
        style={customWidgetStyle}
        title={isNotFound ? 'Arquivo excluído ou movido para a lixeira. Clique para opções.' : undefined}
        className={`inline-flex items-center gap-2 pr-2 pl-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
          isNotFound
            ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:border-red-500/70 hover:bg-red-500/20'
            : isCustomColor
            ? 'bg-dark-card/90 hover:brightness-110'
            : isNodeSelected
            ? 'ring-2 ring-brand-400 border-brand-400 '
            : isLink 
            ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' 
            : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20'
        }`}
        onClick={() => {
          if (isRenaming) return;
          if (isNotFound) {
            setShowDeletedNotice(true);
            return;
          }
          if (fileType === 'folder') {
            const storeState = getStoreState();
            const dispatch = getStoreDispatch();
            dispatch({ type: 'UPDATE_TAB_MODULE', tabId: storeState.activeTabId, module: 'files' });
            window.dispatchEvent(new CustomEvent('navigate-folder', { detail: { folderId: fileId } }));
          } else if ((fileType === 'pdf' || fileType === 'epub') && fileItem) {
            window.dispatchEvent(new CustomEvent('open-file-action', { 
              detail: { editor: props.editor, fileId, title: name || fileItem?.name } 
            }));
          } else if ((fileType === 'audio' || name?.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/)) && fileItem) {
            setShowAudioPlayer(true);
          } else {
            if (fileItem) setShowViewer(true);
            else setShowDeletedNotice(true);
          }
        }}
      >
        <div className="flex items-center justify-center p-2 bg-dark-bg rounded-lg border border-white/5 mr-1">
          {getIcon()}
        </div>
        {isRenaming ? (
          <div
            className="flex items-center gap-1 min-w-0"
            contentEditable={false}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              disabled={isSavingRename}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  handleSaveRename(e);
                } else if (e.key === 'Escape') {
                  handleCancelRename(e);
                }
              }}
              className="bg-black/40 border border-brand-500/80 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-brand-400 min-w-[140px] max-w-[260px] font-medium"
            />
            <button
              type="button"
              onClick={handleSaveRename}
              disabled={isSavingRename}
              title="Salvar (Enter)"
              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={handleCancelRename}
              disabled={isSavingRename}
              title="Cancelar (Esc)"
              className="p-1 rounded hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <span
            onDoubleClick={handleStartRename}
            title="Clique duplo para renomear"
            className="flex-1 break-words leading-tight group-hover:text-white transition-colors cursor-text"
          >
            {name || fileItem?.name || 'Arquivo'}{isNotFound ? ' (Excluído)' : ''}
          </span>
        )}
        <div className={`flex items-center gap-0.5 ml-1 transition-opacity ${showColorPicker ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {!isRenaming && !isNotFound && (
            <button
              type="button"
              onClick={handleStartRename}
              className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
              title="Renomear arquivo"
            >
              <Pencil size={12} />
            </button>
          )}
          <div className="relative">
            <button
              ref={paletteButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
              title="Personalizar cor do widget"
            >
              <Palette size={12} />
            </button>
            {showColorPicker && (
              <ColorPalettePicker
                anchorRef={paletteButtonRef}
                currentColor={color}
                onSelectColor={(c) => {
                  updateAttributes?.({ color: c });
                  setShowColorPicker(false);
                }}
                onClearColor={() => {
                  updateAttributes?.({ color: 'default' });
                  setShowColorPicker(false);
                }}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && props.editor) {
                moveBlockUp(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Subir bloco (Mover para cima)"
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && props.editor) {
                moveBlockDown(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Descer bloco (Mover para baixo)"
          >
            <ArrowDown size={12} />
          </button>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className="p-1 ml-0.5 rounded-md text-dark-subtext hover:bg-black/20 hover:text-red-400 transition-colors"
          title="Remover anexo"
        >
          <X size={14} />
        </button>
      </div>

      {showDeletedNotice && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
            <div className="bg-dark-card border border-red-500/30 rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base leading-tight">Arquivo Excluído</h3>
                  <p className="text-dark-subtext text-xs mt-0.5">Anexo não encontrado ou na lixeira</p>
                </div>
              </div>
              
              <p className="text-dark-subtext text-sm leading-relaxed">
                O arquivo <strong className="text-white">"{name || fileItem?.name || 'Arquivo'}"</strong> foi movido para a lixeira ou excluído do sistema. Deseja remover este widget do documento?
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

      {showDeleteConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
            <div className="bg-dark-card border border-red-500/20 rounded-xl p-5 w-[320px] shadow-2xl flex flex-col gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-semibold text-lg text-center">Excluir Arquivo</h3>
              <p className="text-dark-subtext text-sm text-center">
                Deseja excluir este arquivo permanentemente do Caderno ou apenas desvincular desta página?
              </p>
              
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteNode()}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-dark-bg border border-white/10 hover:bg-white/5 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Desvincular
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir de Tudo'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showViewer && fileItem && (
        <FileViewer 
          item={fileItem} 
          onClose={() => setShowViewer(false)} 
        />
      )}
      
      {showFloatingViewer && fileItem && fileType === 'pdf' && (
        <FloatingPdfViewer
          item={fileItem}
          onClose={() => setShowFloatingViewer(false)}
          onExpand={() => {
            setShowFloatingViewer(false);
            setShowViewer(true);
          }}
        />
      )}

      {showAudioPlayer && fileItem && (
        <AudioPlayerModal
          item={fileItem}
          onClose={() => setShowAudioPlayer(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
