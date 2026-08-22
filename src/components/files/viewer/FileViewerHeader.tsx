import React from 'react';
import { X, Download, FileText, Moon, Sun, Eye, Code } from 'lucide-react';
import type { FileItem } from '../../../types';
import { BookmarksDrawer } from './BookmarksDrawer';

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
  bookmarks: any[];
  showBookmarksMenu: boolean;
  setShowBookmarksMenu: (val: boolean) => void;
  newBookmarkLabel: string;
  setNewBookmarkLabel: (val: string) => void;
  editingBmId: string | null;
  editingBmText: string;
  setEditingBmText: (val: string) => void;
  onAddBookmark: () => void;
  onStartRenameBookmark: (id: string, label: string) => void;
  onSaveRenameBookmark: (id: string) => void;
  onRemoveBookmark: (id: string) => void;
  onJumpToBookmark: (scrollTop: number, label: string) => void;
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
            <button
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

            {isMd && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
                <button
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

        {objectUrl && (
          <a 
            href={objectUrl} 
            download={item.name}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
            title="Download"
          >
            <Download size={20} />
          </a>
        )}
        <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Fechar">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
