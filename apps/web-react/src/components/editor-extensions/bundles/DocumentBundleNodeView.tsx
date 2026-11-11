import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import {
  Layers,
  Palette,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  X,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import ColorPalettePicker from '../ColorPalettePicker';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import DocumentBundleModal from './DocumentBundleModal';
import { Portal } from '../../ui/Portal';
import { triggerToast } from '../../ui/ToastContext';
import { getValidAccessToken, deleteFromDrive } from '../../../services/drive';
import type { BundledFileItem } from './types';
import { playUiClickSound, playUiToggleSound, playUiDeleteSound } from '../../../utils/uiSounds';

export default function DocumentBundleNodeView(props: NodeViewProps) {
  const { node, deleteNode, updateAttributes, editor } = props;
  const { id: bundleId, title, color: rawColor, items: rawItems } = node.attrs;
  const color = rawColor || 'default';
  const items: BundledFileItem[] = rawItems || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title || 'Documentos');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const paletteButtonRef = useRef<HTMLButtonElement>(null);

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    editor.state.selection.from === pos
  );

  // Escuta evento de teclado (Backspace/Delete) para exibir confirmação de exclusão
  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.bundleId === bundleId) {
        setShowDeleteConfirm(true);
      }
    };
    window.addEventListener('document-bundle-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('document-bundle-delete-request', handleDeleteRequest);
  }, [bundleId]);

  // Opens modal with picker pre-expanded when triggered by the /agrupar slash command.
  const [openPickerOnMount, setOpenPickerOnMount] = React.useState(false);
  useEffect(() => {
    const handleOpenPicker = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.bundleId === bundleId) {
        setOpenPickerOnMount(true);
        setIsModalOpen(true);
      }
    };
    window.addEventListener('document-bundle-open-picker', handleOpenPicker);
    return () => window.removeEventListener('document-bundle-open-picker', handleOpenPicker);
  }, [bundleId]);

  const handleDeleteAllFilesPermanently = async () => {
    setIsDeleting(true);
    try {
      for (const item of items) {
        if (window.api?.files) {
          try {
            await window.api.files.delete(item.fileId);
          } catch (delErr) {
            console.warn('[DocumentBundleNodeView] Erro ao deletar do DB:', delErr);
          }
        }
        try {
          const token = await getValidAccessToken();
          if (token && window.api?.files) {
            const fileItem = await window.api.files.getById(item.fileId).catch(() => null);
            if (fileItem?.drive_file_id) {
              await deleteFromDrive(token, fileItem.drive_file_id);
            }
          }
        } catch (driveErr) {
          console.warn('[DocumentBundleNodeView] Erro ao deletar do Drive:', driveErr);
        }
      }
      playUiDeleteSound();
      deleteNode?.();
      setShowDeleteConfirm(false);
      triggerToast('Agrupamento e todos os seus arquivos foram excluídos com sucesso.', 'info');
    } catch (err) {
      console.error('[DocumentBundleNodeView] Falha ao excluir:', err);
      triggerToast('Falha ao excluir arquivos do sistema.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const isCustomColor = Boolean(color && color !== 'default');
  const customWidgetStyle: React.CSSProperties = isCustomColor
    ? {
        backgroundColor: `${color}18`,
        borderColor: isNodeSelected ? color : `${color}60`,
        boxShadow: isNodeSelected
          ? `0 0 0 2px ${color}80, 0 0 12px ${color}30`
          : `0 0 0 1px ${color}20, 0 2px 6px ${color}10`,
      }
    : {};

  const handleStartRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenameValue(title || 'Documentos');
    setIsRenaming(true);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 50);
  };

  const handleSaveRename = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const trimmed = renameValue.trim() || 'Documentos';
    updateAttributes?.({ title: trimmed });
    setIsRenaming(false);
  };

  const handleCancelRename = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setIsRenaming(false);
  };

  const handleUpdateBundle = (newTitle: string, newItems: BundledFileItem[]) => {
    updateAttributes?.({
      title: newTitle,
      items: newItems,
    });
  };

  // Coleta extensões únicas para exibir nos badges compactos
  const uniqueExtensions = Array.from(
    new Set(
      items
        .map((it) => {
          const parts = it.name.split('.');
          return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : it.fileType;
        })
        .filter(Boolean)
    )
  ).slice(0, 3);

  return (
    <NodeViewWrapper as="div" className="flex w-full relative group align-middle my-1">
      <div
        onMouseDown={() => {
          if (typeof pos === 'number' && editor) {
            editor.commands.setNodeSelection(pos);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDragOver) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={() => {
          setIsDragOver(false);
        }}
        onClick={() => {
          if (isRenaming) return;
          playUiClickSound();
          setIsModalOpen(true);
        }}
        style={customWidgetStyle}
        className={`flex w-full items-center gap-2 pr-2.5 pl-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
          isDragOver
            ? 'ring-2 ring-brand-400 border-brand-400 bg-brand-500/20'
            : isNodeSelected
            ? 'ring-2 ring-brand-400 border-brand-400'
            : isCustomColor
            ? 'bg-dark-card/90 hover:brightness-110'
            : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20'
        }`}
      >
        {/* Ícone de Agrupamento com contador */}
        <div className="relative flex items-center justify-center p-2 bg-dark-bg rounded-lg border border-white/5 mr-1">
          <Layers size={16} className="text-brand-400" />
          <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 min-w-[15px] text-[9px] font-bold font-mono rounded-full bg-brand-500 text-white flex items-center justify-center">
            {items.length}
          </span>
        </div>

        {/* Título ou Campo de Renomear */}
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
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleSaveRename(e);
                if (e.key === 'Escape') handleCancelRename(e);
              }}
              className="bg-black/40 border border-brand-500/80 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-brand-400 min-w-[140px] max-w-[240px] font-medium"
            />
            <button
              type="button"
              onClick={handleSaveRename}
              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
              title="Salvar (Enter)"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={handleCancelRename}
              className="p-1 rounded hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
              title="Cancelar (Esc)"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span
              title={title || 'Documentos'}
              onDoubleClick={handleStartRename}
              className="flex-1 truncate font-medium text-xs text-zinc-100 group-hover:text-white transition-colors"
            >
              {title || 'Documentos'}
            </span>

            {/* Badges de extensões */}
            <div className="flex items-center gap-1">
              {uniqueExtensions.map((ext) => (
                <span
                  key={ext}
                  className="px-1 py-0.5 rounded bg-white/5 text-[9px] font-mono text-zinc-400 uppercase border border-white/5"
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar de Ações Rápidas no Hover */}
        <div
          className={`flex items-center gap-0.5 ml-1 transition-opacity ${
            showColorPicker ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {!isRenaming && (
            <button
              type="button"
              onClick={(e) => {
                playUiClickSound();
                handleStartRename(e);
              }}
              className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
              title="Renomear agrupamento"
            >
              <Pencil size={12} />
            </button>
          )}

          {/* Color Picker */}
          <div className="relative">
            <button
              ref={paletteButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                playUiClickSound();
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

          {/* Move Up/Down */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playUiClickSound();
              if (typeof pos === 'number' && editor) {
                moveBlockUp(editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Mover para cima"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playUiClickSound();
              if (typeof pos === 'number' && editor) {
                moveBlockDown(editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Mover para baixo"
          >
            <ArrowDown size={12} />
          </button>

          {/* Delete widget */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playUiClickSound();
              setShowDeleteConfirm(true);
            }}
            className="p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 text-dark-subtext transition-colors"
            title="Excluir agrupamento"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Modal de Gestão Completa */}
      {isModalOpen && (
        <DocumentBundleModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            // Reset picker flag so re-opening normally doesn't auto-expand it.
            setOpenPickerOnMount(false);
          }}
          editor={editor}
          getPos={props.getPos}
          bundleId={bundleId}
          initialTitle={title}
          initialItems={items}
          color={color}
          onUpdateBundle={handleUpdateBundle}
          initialShowLooseFilesPicker={openPickerOnMount}
        />
      )}

      {/* Modal de Confirmação de Exclusão do Agrupamento */}
      {showDeleteConfirm && (
        <Portal>
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            contentEditable={false}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-[#0f0e17] border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">Excluir Agrupamento</h3>
                  <p className="text-xs text-zinc-400">
                    "{title || 'Documentos'}" ({items.length} {items.length === 1 ? 'arquivo' : 'arquivos'})
                  </p>
                </div>
              </div>

              <p className="text-zinc-300 text-sm leading-relaxed">
                Como deseja proceder com os arquivos anexados a este agrupamento?
              </p>

              <div className="flex flex-col gap-2 mt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    playUiToggleSound(false);
                    if (typeof pos === 'number' && editor) {
                      editor.commands.ungroupDocumentBundle(pos);
                      triggerToast('Arquivos desagrupados na página.', 'info');
                    }
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full py-2.5 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-brand-500/30 text-white rounded-xl font-medium transition-all text-xs flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-semibold text-zinc-100">Desagrupar na página</p>
                    <p className="text-[11px] text-zinc-400">Mantém todos os documentos soltos no texto</p>
                  </div>
                  <Layers size={16} className="text-brand-400 shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    playUiClickSound();
                    deleteNode?.();
                    setShowDeleteConfirm(false);
                    triggerToast('Agrupamento desvinculado da página.', 'info');
                  }}
                  className="w-full py-2.5 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-amber-500/30 text-white rounded-xl font-medium transition-all text-xs flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-semibold text-zinc-100">Apenas desvincular da página</p>
                    <p className="text-[11px] text-zinc-400">Remove o widget, mas mantém os arquivos no sistema</p>
                  </div>
                  <X size={16} className="text-amber-400 shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteAllFilesPermanently}
                  className="w-full py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-300 rounded-xl font-medium transition-all text-xs flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-semibold text-red-200">Excluir permanentemente de tudo</p>
                    <p className="text-[11px] text-red-300/70">Apaga os arquivos do Caderno e do Google Drive</p>
                  </div>
                  <Trash2 size={16} className="text-red-400 shrink-0" />
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    if (props.editor) props.editor.commands.focus();
                  }}
                  disabled={isDeleting}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </NodeViewWrapper>
  );
}
