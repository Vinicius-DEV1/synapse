import React, { useRef, useEffect } from 'react';
import { Bookmark, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Bookmark as BookmarkType } from '../../../utils/reading-progress';

interface BookmarksDrawerProps {
  bookmarks: BookmarkType[];
  showBookmarksMenu: boolean;
  setShowBookmarksMenu: (show: boolean) => void;
  newBookmarkLabel: string;
  setNewBookmarkLabel: (label: string) => void;
  editingBmId: string | null;
  editingBmText: string;
  setEditingBmText: (text: string) => void;
  onAddBookmark: (label?: string) => void;
  onStartRenameBookmark: (bm: BookmarkType, e: React.MouseEvent) => void;
  onSaveRenameBookmark: (bmId: string, e?: React.FormEvent) => void;
  onRemoveBookmark: (bmId: string) => void;
  onJumpToBookmark: (targetScrollTop: number, label?: string) => void;
}

export function BookmarksDrawer({
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
  onJumpToBookmark
}: BookmarksDrawerProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowBookmarksMenu(false);
      }
    };
    if (showBookmarksMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBookmarksMenu, setShowBookmarksMenu]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowBookmarksMenu(!showBookmarksMenu)}
        className={`p-2 rounded-lg transition-colors relative ${
          bookmarks.length > 0
            ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
            : 'text-dark-subtext hover:text-white hover:bg-white/10'
        }`}
        title="Marcadores de Página"
      >
        <Bookmark size={18} />
        {bookmarks.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
            {bookmarks.length}
          </span>
        )}
      </button>

      {showBookmarksMenu && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-dark-card/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Bookmark size={14} className="text-amber-400" />
              Marcadores Salvos
            </h4>
            <span className="text-[10px] text-dark-subtext">{bookmarks.length} salvos</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddBookmark();
            }}
            className="flex items-center gap-1.5 mb-3"
          >
            <input
              type="text"
              placeholder="Nome do marcador..."
              value={newBookmarkLabel}
              onChange={(e) => setNewBookmarkLabel(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-dark-subtext focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors flex items-center justify-center"
              title="Adicionar Marcador nesta posição"
            >
              <Plus size={14} />
            </button>
          </form>

          {bookmarks.length === 0 ? (
            <p className="text-center py-4 text-xs text-dark-subtext">Nenhum marcador salvo ainda.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => onJumpToBookmark(bm.scrollTop, bm.label)}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group text-xs"
                >
                  {editingBmId === bm.id ? (
                    <form
                      onSubmit={(e) => onSaveRenameBookmark(bm.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 flex-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingBmText}
                        onChange={(e) => setEditingBmText(e.target.value)}
                        className="flex-1 bg-white/10 border border-brand-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                      />
                      <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
                        <Check size={13} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-medium text-white truncate group-hover:text-brand-300 transition-colors">
                          {bm.label}
                        </span>
                        <span className="text-[9px] text-dark-subtext">
                          {new Date(bm.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => onStartRenameBookmark(bm, e)}
                          className="p-1 text-dark-subtext hover:text-white rounded transition-colors opacity-60 group-hover:opacity-100"
                          title="Editar Nome"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveBookmark(bm.id);
                          }}
                          className="p-1 text-dark-subtext hover:text-red-400 rounded transition-colors opacity-60 group-hover:opacity-100"
                          title="Remover Marcador"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
