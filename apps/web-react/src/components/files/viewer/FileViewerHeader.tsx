import React from 'react';
import { X, Download, FileText, Moon, Sun, Eye, Code, Pencil, Loader2 } from 'lucide-react';
import type { FileItem } from '../../../types';
import { BookmarksDrawer } from './BookmarksDrawer';
import type { Bookmark as BookmarkType } from '../../../utils/reading-progress';

interface FileViewerHeaderProps {
  item: FileItem;
  isText: boolean;
  isMd: boolean;
  wordCount: number;
  estimatedMinutes: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  viewMode: 'rendered' | 'raw';
  setViewMode: (val: 'rendered' | 'raw') => void;
  objectUrl: string | null;
  bookmarks: BookmarkType[];
  showBookmarksMenu: boolean;
  setShowBookmarksMenu: (val: boolean) => void;
  newBookmarkLabel: string;
  setNewBookmarkLabel: (val: string) => void;
  editingBmId: string | null;
  editingBmText: string;
  setEditingBmText: (val: string) => void;
  onAddBookmark: (label?: string) => void;
  onStartRenameBookmark: (bm: BookmarkType, e: React.MouseEvent) => void;
  onSaveRenameBookmark: (bmId: string, e?: React.FormEvent) => void;
  onRemoveBookmark: (id: string) => void;
  onJumpToBookmark: (scrollTop: number, label?: string) => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onOpenAi?: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
  onClose: () => void;
}

export function FileViewerHeader({
  item,
  isText,
  isMd,
  wordCount,
  estimatedMinutes,
  darkMode,
  setDarkMode,
  viewMode,
  setViewMode,
  objectUrl,
  bookmarks,
  showBookmarksMenu,
  setShowBookmarksMenu,
  newBookmarkLabel,
  setNewBookmarkLabel,
  editingBmId,
  editingBmText,
  setEditingBmText,
  onAddBookmark,
  onStartRenameBookmark,
  onSaveRenameBookmark,
  onRemoveBookmark,
  onJumpToBookmark,
  isEditing = false,
  onToggleEdit,
  onOpenAi,
  onDownload,
  isDownloading = false,
  onClose,
}: FileViewerHeaderProps) {
  const ext = item.name.includes('.') ? item.name.split('.').pop()?.toUpperCase() : '';

  return (
    <div
      className={`h-14 border-b border-white/5 flex items-center justify-between px-5 sm:px-8 backdrop-blur-md z-30 sticky top-0 transition-colors duration-200 ${
        darkMode ? 'bg-black/90' : 'bg-dark-bg/90'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 text-zinc-400 flex items-center justify-center shrink-0 border border-white/5">
          <FileText size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-zinc-100 font-medium text-sm truncate max-w-[200px] sm:max-w-md">{item.name}</h3>
            {ext && (
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono font-semibold rounded bg-white/5 text-zinc-400 border border-white/5 shrink-0">
                {ext}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
            <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
            {isText && wordCount > 0 && (
              <>
                <span>•</span>
                <span>{wordCount} palavras</span>
                <span>•</span>
                <span>~{estimatedMinutes} min</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isText && (
          <>
            {/* View Mode Toggle (Formatted / Raw Text) */}
            {isMd && !isEditing && (
              <div className="flex items-center bg-white/5 border border-white/5 rounded-lg p-0.5 gap-0.5 mr-1">
                <button
                  type="button"
                  onClick={() => setViewMode('rendered')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                    viewMode === 'rendered'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Visualizar Formatado"
                >
                  <Eye size={13} />
                  <span>Formatado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                    viewMode === 'raw'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Visualizar Código Fonte"
                >
                  <Code size={13} />
                  <span>Texto</span>
                </button>
              </div>
            )}

            {/* AI Assistant Button */}
            {isMd && onOpenAi && (
              <button
                type="button"
                onClick={onOpenAi}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center group"
                title="Assistente de IA para este documento"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">✨</span>
              </button>
            )}

            {/* Edit (Pencil) Button */}
            {isMd && onToggleEdit && (
              <button
                type="button"
                onClick={onToggleEdit}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                  isEditing
                    ? 'bg-white/15 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title={isEditing ? 'Visualizar documento' : 'Editar documento (Markdown)'}
              >
                <Pencil size={16} />
              </button>
            )}

            {/* Dark Mode / High Contrast Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title={darkMode ? 'Modo Normal' : 'Modo Alto Contraste / Noturno'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Bookmarks Drawer */}
            <BookmarksDrawer
              bookmarks={bookmarks}
              showBookmarksMenu={showBookmarksMenu}
              setShowBookmarksMenu={setShowBookmarksMenu}
              newBookmarkLabel={newBookmarkLabel}
              setNewBookmarkLabel={setNewBookmarkLabel}
              editingBmId={editingBmId}
              editingBmText={editingBmText}
              setEditingBmText={setEditingBmText}
              onAddBookmark={onAddBookmark}
              onStartRenameBookmark={onStartRenameBookmark}
              onSaveRenameBookmark={onSaveRenameBookmark}
              onRemoveBookmark={onRemoveBookmark}
              onJumpToBookmark={onJumpToBookmark}
            />
          </>
        )}

        {/* Download File */}
        {objectUrl && onDownload && (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
            title="Download"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </button>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
          title="Fechar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
