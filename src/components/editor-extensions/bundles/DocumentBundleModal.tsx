import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  File,
  Image as ImageIcon,
  Film,
  Music,
  GripVertical,
  ExternalLink,
  Trash2,
  Plus,
  Layers,
  Check,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Eye,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { triggerToast } from '../../ui/ToastContext';
import { getValidAccessToken, deleteFromDrive } from '../../../services/drive';
import FileViewer from '../../files/FileViewer';
import type { Editor } from '@tiptap/core';
import type { BundledFileItem } from './types';
import type { FileItem } from '../../../types/files';

interface DocumentBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  getPos: (() => number | undefined) | number;
  bundleId: string;
  initialTitle: string;
  initialItems: BundledFileItem[];
  color?: string;
  onUpdateBundle: (title: string, items: BundledFileItem[]) => void;
  /** When true, the loose-files picker opens immediately on mount (used by /agrupar). */
  initialShowLooseFilesPicker?: boolean;
}

export default function DocumentBundleModal({
  isOpen,
  onClose,
  editor,
  getPos,
  initialTitle,
  initialItems,
  color = 'default',
  onUpdateBundle,
  initialShowLooseFilesPicker = false,
}: DocumentBundleModalProps) {
  const [title, setTitle] = useState(initialTitle || 'Documentos');
  const [items, setItems] = useState<BundledFileItem[]>(initialItems || []);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showLooseFilesPicker, setShowLooseFilesPicker] = useState(initialShowLooseFilesPicker);
  const [viewerItem, setViewerItem] = useState<FileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<BundledFileItem | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initialTitle || 'Documentos');
    setItems(initialItems || []);
  }, [initialTitle, initialItems]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  if (!isOpen) return null;

  const currentPos = typeof getPos === 'function' ? getPos() : getPos;

  const handleSaveTitle = () => {
    const trimmed = title.trim() || 'Documentos';
    setTitle(trimmed);
    setIsEditingTitle(false);
    onUpdateBundle(trimmed, items);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...items];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setItems(updated);
    setDraggedIndex(null);
    onUpdateBundle(title, updated);
    triggerToast('Ordem dos documentos atualizada.', 'info', 2000);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setItems(updated);
    onUpdateBundle(title, updated);
  };

  const handleOpenFile = async (item: BundledFileItem) => {
    if (window.api?.files) {
      try {
        const fullItem = await window.api.files.getById(item.fileId);
        if (fullItem) {
          setViewerItem(fullItem);
          return;
        }
      } catch (err) {
        console.error('[DocumentBundleModal] Erro ao buscar arquivo:', err);
      }
    }

    const fallbackItem: FileItem = {
      id: item.fileId,
      name: item.name,
      file_type: item.fileType,
      file_size: item.fileSize || 0,
      local_path: null,
      drive_file_id: null,
      folder_id: null,
      mime_type: null,
    };
    setViewerItem(fallbackItem);
  };

  const handleUngroupSingle = (fileId: string) => {
    if (!editor || typeof currentPos !== 'number') return;
    editor.commands.removeFromDocumentBundle(currentPos, fileId, true);
    triggerToast('Documento desagrupado e inserido na página.', 'success');
    onClose();
  };

  const handleRemoveSingle = (fileId: string) => {
    const item = items.find((it) => it.fileId === fileId);
    if (item) {
      setFileToDelete(item);
    }
  };

  const handleConfirmRemoveFromGroupOnly = (file: BundledFileItem) => {
    const updated = items.filter((it) => it.fileId !== file.fileId);
    setItems(updated);
    onUpdateBundle(title, updated);

    if (editor && typeof currentPos === 'number') {
      editor.commands.removeFromDocumentBundle(currentPos, file.fileId, false);
    }
    setFileToDelete(null);
    triggerToast('Arquivo desvinculado do agrupamento.', 'info');
  };

  const handleConfirmDeleteFilePermanently = async (file: BundledFileItem) => {
    setIsDeletingFile(true);
    try {
      if (window.api?.files) {
        await window.api.files.delete(file.fileId);
      }
      try {
        const token = await getValidAccessToken();
        if (token && window.api?.files) {
          const fileItem = await window.api.files.getById(file.fileId).catch(() => null);
          if (fileItem?.drive_file_id) {
            await deleteFromDrive(token, fileItem.drive_file_id);
          }
        }
      } catch (driveErr) {
        console.warn('[DocumentBundleModal] Falha ao deletar do Drive:', driveErr);
      }

      const updated = items.filter((it) => it.fileId !== file.fileId);
      setItems(updated);
      onUpdateBundle(title, updated);

      if (editor && typeof currentPos === 'number') {
        editor.commands.removeFromDocumentBundle(currentPos, file.fileId, false);
      }
      triggerToast('Arquivo excluído permanentemente do sistema.', 'info');
    } catch (err) {
      console.error('[DocumentBundleModal] Erro ao excluir:', err);
      triggerToast('Falha ao excluir arquivo do sistema.', 'error');
    } finally {
      setIsDeletingFile(false);
      setFileToDelete(null);
    }
  };

  const handleUngroupAll = () => {
    if (!editor || typeof currentPos !== 'number') return;
    editor.commands.ungroupDocumentBundle(currentPos);
    triggerToast('Todos os documentos foram desagrupados na página.', 'success');
    onClose();
  };

  // Encontra arquivos soltos no documento da página atual
  const getLooseFilesInDoc = (): { pos: number; fileId: string; name: string; fileType: string; isLink: boolean }[] => {
    if (!editor) return [];
    const results: { pos: number; fileId: string; name: string; fileType: string; isLink: boolean }[] = [];
    editor.state.doc.descendants((docNode, docPos) => {
      if (docNode.type.name === 'fileWidget' && docNode.attrs.fileId) {
        results.push({
          pos: docPos,
          fileId: docNode.attrs.fileId,
          name: docNode.attrs.name || 'Arquivo',
          fileType: docNode.attrs.fileType || 'other',
          isLink: !!docNode.attrs.isLink,
        });
      }
    });
    return results;
  };

  const handleAbsorbLooseFile = (loose: { pos: number; fileId: string; name: string; fileType: string; isLink: boolean }) => {
    if (!editor || typeof currentPos !== 'number') return;

    const newItem: BundledFileItem = {
      fileId: loose.fileId,
      name: loose.name,
      fileType: loose.fileType,
      isLink: loose.isLink,
      addedAt: Date.now(),
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);

    const tr = editor.state.tr;
    const bundleNode = editor.state.doc.nodeAt(currentPos);
    if (!bundleNode) return;

    tr.setNodeMarkup(currentPos, undefined, {
      ...bundleNode.attrs,
      title,
      items: updatedItems,
    });

    // Remove o nó solto (calculando offset caso a posição seja antes ou depois)
    tr.delete(loose.pos, loose.pos + 1);
    editor.view.dispatch(tr);

    triggerToast(`"${loose.name}" inserido no agrupamento.`, 'success');
    setShowLooseFilesPicker(false);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={16} className="text-blue-400" />;
      case 'image':
        return <ImageIcon size={16} className="text-green-400" />;
      case 'video':
        return <Film size={16} className="text-purple-400" />;
      case 'audio':
        return <Music size={16} className="text-pink-400" />;
      default:
        return <File size={16} className="text-brand-400" />;
    }
  };

  const looseFiles = showLooseFilesPicker ? getLooseFilesInDoc() : [];

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div
          className="bg-[#0f0e17] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
              <div
                style={
                  color && color !== 'default'
                    ? { backgroundColor: `${color}20`, borderColor: `${color}40`, color }
                    : undefined
                }
                className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0"
              >
                <Layers size={20} />
              </div>
              <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      className="bg-black/50 border border-brand-500/60 rounded-lg px-2.5 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-brand-400 w-full font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTitle}
                      className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                      title="Salvar nome"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/title">
                    <span
                      onDoubleClick={() => setIsEditingTitle(true)}
                      className="text-white font-medium text-base truncate cursor-pointer hover:text-brand-300 transition-colors"
                      title={title}
                    >
                      {title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="opacity-0 group-hover/title:opacity-100 p-1 text-zinc-400 hover:text-white transition-opacity"
                      title="Renomear agrupamento"
                    >
                      <Pencil size={12} />
                    </button>
                    <span className="text-[11px] text-zinc-500 font-mono">({items.length} {items.length === 1 ? 'arquivo' : 'arquivos'})</span>
                  </div>
                )}
                <p className="text-xs text-zinc-400 mt-0.5">
                  Agrupamento de documentos • Arraste para reordenar
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: Lista de Arquivos */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">
                Nenhum documento neste agrupamento.
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.fileId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 group ${
                    draggedIndex === index
                      ? 'border-brand-500/60 bg-brand-500/10 opacity-50'
                      : 'border-white/[0.06] bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                    <div
                      className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-300 transition-colors"
                      title="Arraste para reordenar"
                    >
                      <GripVertical size={16} />
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/5 flex items-center justify-center shrink-0">
                      {getFileIcon(item.fileType)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        onClick={() => handleOpenFile(item)}
                        className="text-sm font-medium text-zinc-200 truncate group-hover:text-white cursor-pointer hover:underline"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-mono">
                        <span className="uppercase">{item.fileType}</span>
                        {item.isLink && <span>• Link</span>}
                      </div>
                    </div>
                  </div>

                  {/* Ações por Item */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                      title="Mover para cima"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenFile(item)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors"
                      title="Visualizar documento"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUngroupSingle(item.fileId)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                      title="Desagrupar para a página"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSingle(item.fileId)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remover do agrupamento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Inserir Documento Solto da Página */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLooseFilesPicker(!showLooseFilesPicker)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dashed border-white/10 hover:border-brand-500/40 hover:bg-brand-500/5 text-xs text-zinc-400 hover:text-brand-300 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Plus size={14} />
                  <span>Anexar documento que está solto nesta página</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${showLooseFilesPicker ? 'rotate-180' : ''}`}
                />
              </button>

              {showLooseFilesPicker && (
                <div className="mt-2 p-3 bg-zinc-900/60 border border-white/5 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                  {looseFiles.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-2">
                      Nenhum outro documento avulso encontrado nesta página.
                    </p>
                  ) : (
                    looseFiles.map((loose) => (
                      <div
                        key={loose.pos}
                        className="flex items-center justify-between p-2 rounded-lg bg-black/40 hover:bg-brand-500/10 border border-white/5 hover:border-brand-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 mr-2">
                          {getFileIcon(loose.fileType)}
                          <span className="text-xs text-zinc-300 truncate">{loose.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAbsorbLooseFile(loose)}
                          className="px-2 py-1 text-[11px] font-medium rounded bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors"
                        >
                          Mover para o grupo
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/40 flex items-center justify-between">
            <button
              type="button"
              onClick={handleUngroupAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
              title="Transforma todos os arquivos em widgets individuais soltos na página"
            >
              <Layers size={14} />
              <span>Desagrupar Todos na Página</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>

      {viewerItem && (
        <FileViewer
          item={viewerItem}
          onClose={() => setViewerItem(null)}
        />
      )}

      {fileToDelete && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setFileToDelete(null)}
        >
          <div
            className="bg-[#0f0e17] border border-red-500/20 rounded-2xl p-5 w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertCircle size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-semibold text-sm">Remover Arquivo</h4>
                <p className="text-xs text-zinc-400 truncate">{fileToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Deseja apenas desvincular este arquivo do agrupamento ou excluí-lo permanentemente do sistema?
            </p>

            <div className="flex flex-col gap-2 mt-1">
              <button
                type="button"
                disabled={isDeletingFile}
                onClick={() => handleConfirmRemoveFromGroupOnly(fileToDelete)}
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-between"
              >
                <span>Apenas desvincular do grupo</span>
                <X size={14} className="text-zinc-400" />
              </button>

              <button
                type="button"
                disabled={isDeletingFile}
                onClick={() => handleConfirmDeleteFilePermanently(fileToDelete)}
                className="w-full py-2 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-lg font-medium text-xs transition-colors flex items-center justify-between"
              >
                <span>{isDeletingFile ? 'Excluindo...' : 'Excluir permanentemente de tudo'}</span>
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                type="button"
                disabled={isDeletingFile}
                onClick={() => setFileToDelete(null)}
                className="px-3 py-1 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Portal>
  );
}
