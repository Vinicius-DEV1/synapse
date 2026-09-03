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
  return (
    <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-dark-card/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg shrink-0">
          <FileText size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-medium text-sm truncate">{item.name}</h3>
          <p className="text-xs text-dark-subtext flex items-center gap-2">
            <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
            {isText && wordCount > 0 && (
              <>
                <span>•</span>
                <span>{wordCount} palavras</span>
                <span>•</span>
                <span>~{estimatedMinutes} min de leitura</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isText && (
          <>
            {/* Discreet AI Button */}
            {isMd && onOpenAi && (
              <button
                type="button"
                onClick={onOpenAi}
                className="p-2 text-dark-subtext hover:text-brand-300 hover:bg-brand-500/15 rounded-lg transition-all flex items-center justify-center group"
                title="Assistente de IA para este documento"
              >
                <span className="text-base group-hover:scale-125 transition-transform">✨</span>
              </button>
            )}

            {/* Manual Edit (Pencil) Button */}
            {isMd && onToggleEdit && (
              <button
                type="button"
                onClick={onToggleEdit}
                className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                  isEditing
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                    : 'text-dark-subtext hover:text-white hover:bg-white/10'
                }`}
                title={isEditing ? 'Visualizar documento' : 'Editar documento (Markdown)'}
              >
                <Pencil size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title={darkMode ? 'Modo Normal' : 'Modo Alto Contraste / Noturno'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

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

            {isMd && !isEditing && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('rendered')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    viewMode === 'rendered' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
                  }`}
                  title="Visualizar Formatado"
                >
                  <Eye size={14} />
                  <span>Formatado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    viewMode === 'raw' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
                  }`}
                  title="Visualizar Código Fonte"
                >
                  <Code size={14} />
                  <span>Texto</span>
                </button>
              </div>
            )}
          </>
        )}

        {objectUrl && onDownload && (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Download"
          >
            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
