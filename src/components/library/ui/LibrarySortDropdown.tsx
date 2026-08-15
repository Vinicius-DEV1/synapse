import React from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';

export type SortBy = 'last_read' | 'title' | 'created' | 'author';
export type SortOrder = 'asc' | 'desc';

export const SORT_LABELS: Record<SortBy, string> = {
  last_read: 'Último lido',
  title: 'Título A-Z',
  created: 'Data de adição',
  author: 'Autor',
};

interface LibrarySortDropdownProps {
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (s: SortOrder) => void;
  showSortDropdown: boolean;
  setShowSortDropdown: (show: boolean) => void;
  onOpen: () => void;
}

export function LibrarySortDropdown({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showSortDropdown,
  setShowSortDropdown,
  onOpen,
}: LibrarySortDropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 border border-white/5 transition-all"
      >
        <ArrowUpDown size={14} />
        <span>{SORT_LABELS[sortBy]}</span>
        <ChevronDown size={14} />
      </button>
      {showSortDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] animate-scale-in">
            {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (sortBy === key) {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(key);
                    setSortOrder(key === 'title' || key === 'author' ? 'asc' : 'desc');
                  }
                  setShowSortDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  sortBy === key
                    ? 'text-brand-400 bg-brand-500/10'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                }`}
              >
                {SORT_LABELS[key]}
                {sortBy === key && (
                  <span className="ml-2 text-xs opacity-60">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
