import React from 'react';
import { BookOpen, ChevronDown, Edit2 } from 'lucide-react';
import type { LibraryCollection } from '../../../types';

interface LibraryCollectionDropdownProps {
  collections: LibraryCollection[];
  selectedCollection: string | null;
  setSelectedCollection: (id: string | null) => void;
  showCollectionDropdown: boolean;
  setShowCollectionDropdown: (show: boolean) => void;
  editingCollectionId: string | null;
  setEditingCollectionId: (id: string | null) => void;
  editingCollectionName: string;
  setEditingCollectionName: (name: string) => void;
  handleSaveRename: (col: LibraryCollection) => void;
  handleStartRename: (e: React.MouseEvent, col: LibraryCollection) => void;
  onOpen: () => void;
}

export function LibraryCollectionDropdown({
  collections,
  selectedCollection,
  setSelectedCollection,
  showCollectionDropdown,
  setShowCollectionDropdown,
  editingCollectionId,
  setEditingCollectionId,
  editingCollectionName,
  setEditingCollectionName,
  handleSaveRename,
  handleStartRename,
  onOpen,
}: LibraryCollectionDropdownProps) {
  if (collections.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
          selectedCollection
            ? 'border-brand-500/30 text-brand-400 bg-brand-500/10'
            : 'border-white/5 text-dark-subtext hover:text-dark-text hover:bg-white/5'
        }`}
      >
        <BookOpen size={14} />
        <span>
          {selectedCollection
            ? collections.find((c) => c.id === selectedCollection)?.name || 'Coleção'
            : 'Coleções'}
        </span>
        <ChevronDown size={14} />
      </button>
      {showCollectionDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCollectionDropdown(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] animate-scale-in">
            <button
              onClick={() => {
                setSelectedCollection(null);
                setShowCollectionDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                !selectedCollection
                  ? 'text-brand-400 bg-brand-500/10'
                  : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
              }`}
            >
              Todas as coleções
            </button>
            {collections.map((col) => (
              <div key={col.id} className="relative group">
                {editingCollectionId === col.id ? (
                  <div className="px-3 py-1.5 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      autoFocus
                      value={editingCollectionName}
                      onChange={e => setEditingCollectionName(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                          await handleSaveRename(col);
                        } else if (e.key === 'Escape') {
                          setEditingCollectionId(null);
                        }
                      }}
                      onBlur={() => handleSaveRename(col)}
                      className="w-full bg-dark-bg/50 border border-brand-500/50 rounded px-2 py-1 text-sm text-dark-text outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedCollection(col.id);
                        setShowCollectionDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors pr-10 ${
                        selectedCollection === col.id
                          ? 'text-brand-400 bg-brand-500/10'
                          : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      {col.name}
                    </button>
                    <button
                      onClick={(e) => handleStartRename(e, col)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-dark-subtext/50 hover:text-brand-400 hover:bg-brand-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Renomear coleção"
                    >
                      <Edit2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
