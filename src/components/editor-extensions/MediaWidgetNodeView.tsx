import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Film, BookOpen, X, ArrowUp, ArrowDown, Palette, AlertCircle } from 'lucide-react';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';
import ColorPalettePicker from './ColorPalettePicker';
import { Portal } from '../ui/Portal';

export default function MediaWidgetNodeView(props: any) {
  const { node, deleteNode, updateAttributes } = props;
  const { mediaId, mediaType, title, color: rawColor } = node.attrs;
  const color = rawColor || 'default';

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [mediaItem, setMediaItem] = useState<any>(null);
  const [showDeletedNotice, setShowDeletedNotice] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  const loadMedia = async () => {
    if (!mediaId) {
      setIsLoadingMedia(false);
      return;
    }
    setIsLoadingMedia(true);
    try {
      if (mediaType === 'video') {
        if (window.api?.sync) {
          const rows = await window.api.sync.getTable('videos');
          const found = (rows as any[])?.find((v: any) => v.id === mediaId && !v.deleted_at);
          setMediaItem(found || null);
        } else {
          setMediaItem({ id: mediaId, title });
        }
      } else if (mediaType === 'book') {
        if (window.api?.library) {
          const books = await window.api.library.getBooks();
          const found = (books as any[])?.find((b: any) => b.id === mediaId && !b.deleted_at);
          setMediaItem(found || null);
        } else {
          setMediaItem({ id: mediaId, title });
        }
      } else {
        setMediaItem({ id: mediaId, title });
      }
    } catch (e) {
      console.error("Failed to load media widget item", e);
      setMediaItem(null);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    loadMedia();
    const handleSync = () => loadMedia();
    window.addEventListener('app-sync-trigger', handleSync);
    window.addEventListener('caderno-sync-complete', handleSync);
    window.addEventListener('caderno-library-updated', handleSync);
    window.addEventListener('caderno-video-updated', handleSync);
    return () => {
      window.removeEventListener('app-sync-trigger', handleSync);
      window.removeEventListener('caderno-sync-complete', handleSync);
      window.removeEventListener('caderno-library-updated', handleSync);
      window.removeEventListener('caderno-video-updated', handleSync);
    };
  }, [mediaId, mediaType]);

  const isNotFound = !isLoadingMedia && mediaItem === null;

  const getIcon = () => {
    if (isNotFound) {
      return <AlertCircle size={16} className="text-red-400" />;
    }
    switch(mediaType) {
      case 'video': return <Film size={16} className="text-purple-400" />;
      case 'book': return <BookOpen size={16} className="text-blue-400" />;
      default: return <Film size={16} className="text-brand-400" />;
    }
  };

  const handleOpenAction = () => {
    if (isNotFound) {
      setShowDeletedNotice(true);
      return;
    }
    window.dispatchEvent(new CustomEvent('open-media-action', { 
      detail: { mediaId, mediaType, title: mediaItem?.title || title } 
    }));
  };

  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.mediaId === mediaId) {
        setShowConfirm(true);
      }
    };
    window.addEventListener('media-widget-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('media-widget-delete-request', handleDeleteRequest);
  }, [mediaId]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
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
          if (typeof pos === 'number' && props.editor) {
            props.editor.commands.setNodeSelection(pos);
          }
        }}
        style={customWidgetStyle}
        title={isNotFound ? 'Mídia excluída ou movida para a lixeira. Clique para opções.' : undefined}
        className={`inline-flex items-center gap-2 pr-2 pl-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
          isNotFound
            ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:border-red-500/70 hover:bg-red-500/20'
            : isCustomColor
            ? 'bg-dark-card/90 hover:brightness-110'
            : isNodeSelected
            ? 'ring-2 ring-brand-400 border-brand-400'
            : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20'
        }`}
        onClick={handleOpenAction}
      >
        <div className="flex items-center justify-center p-2 bg-dark-bg rounded-lg border border-white/5 mr-1">
          {getIcon()}
        </div>
        <span className="flex-1 break-words leading-tight group-hover:text-white transition-colors">
          {mediaItem?.title || title || (mediaType === 'video' ? 'Vídeo' : 'Livro')}{isNotFound ? ' (Excluído)' : ''}
        </span>
        <div className={`flex items-center gap-0.5 ml-1 transition-opacity ${showColorPicker ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="relative">
            <button
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
              <div ref={colorPickerRef} onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 z-50">
                <ColorPalettePicker
                  currentColor={color}
                  onSelectColor={(c) => {
                    updateAttributes?.({ color: c });
                    setShowColorPicker(false);
                  }}
                  onClearColor={() => {
                    updateAttributes?.({ color: 'default' });
                    setShowColorPicker(false);
                  }}
                />
              </div>
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
          onClick={handleDelete}
          className="p-1 ml-0.5 rounded-md text-dark-subtext hover:bg-black/20 hover:text-red-400 transition-colors"
          title="Remover"
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
                  <h3 className="text-white font-semibold text-base leading-tight">
                    {mediaType === 'video' ? 'Vídeo Excluído' : 'Livro Excluído'}
                  </h3>
                  <p className="text-dark-subtext text-xs mt-0.5">Mídia não encontrada ou na lixeira</p>
                </div>
              </div>
              
              <p className="text-dark-subtext text-sm leading-relaxed">
                O {mediaType === 'video' ? 'vídeo' : 'livro'} <strong className="text-white">"{title || mediaItem?.title || 'Mídia'}"</strong> foi movido para a lixeira ou excluído do sistema. Deseja remover este widget do documento?
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
            <div className="bg-dark-card border border-red-500/20 rounded-xl p-5 w-[320px] shadow-2xl flex flex-col gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-semibold text-lg text-center">Remover Vínculo</h3>
              <p className="text-dark-subtext text-sm text-center">
                Deseja remover este vínculo da anotação? (A mídia original não será excluída)
              </p>
              
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteNode()}
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
}
