import React from 'react';
import { Search, Tag, FileText, Zap } from 'lucide-react';

interface QuestionsExplorerFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedOrigin: 'all' | 'linked' | 'standalone';
  onSelectedOriginChange: (origin: 'all' | 'linked' | 'standalone') => void;
  selectedStatus: 'all' | 'pending' | 'errors';
  onSelectedStatusChange: (status: 'all' | 'pending' | 'errors') => void;
  selectedTag: string | null;
  onSelectedTagChange: (tag: string | null) => void;
  allAvailableTags: string[];
}

export const QuestionsExplorerFilters = React.memo(function QuestionsExplorerFilters({
  searchTerm,
  onSearchTermChange,
  selectedOrigin,
  onSelectedOriginChange,
  selectedStatus,
  onSelectedStatusChange,
  selectedTag,
  onSelectedTagChange,
  allAvailableTags,
}: QuestionsExplorerFiltersProps) {
  return (
    <div className="bg-dark-card/50 border border-white/5 rounded-2xl p-4 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Buscar por título, enunciado, tag ou comentário..."
          className="w-full pl-10 pr-4 py-2 bg-dark-bg/60 border border-white/5 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Origin Filter */}
        <div className="flex items-center gap-1 bg-dark-bg/50 p-1 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => onSelectedOriginChange('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              selectedOrigin === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => onSelectedOriginChange('linked')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              selectedOrigin === 'linked'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText size={12} />
            <span>Do Caderno</span>
          </button>
          <button
            onClick={() => onSelectedOriginChange('standalone')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              selectedOrigin === 'standalone'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap size={12} />
            <span>Avulsas</span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-dark-bg/50 p-1 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => onSelectedStatusChange('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Qualquer Status
          </button>
          <button
            onClick={() => onSelectedStatusChange('pending')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'pending' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => onSelectedStatusChange('errors')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-rose-300 ${
              selectedStatus === 'errors'
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium'
                : 'hover:text-rose-200'
            }`}
          >
            Com Erros
          </button>
        </div>
      </div>

      {/* Tag Pills */}
      {allAvailableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
          <span className="text-[11px] text-zinc-500 mr-1 flex items-center gap-1">
            <Tag size={12} />
            <span>Tags:</span>
          </span>
          {selectedTag && (
            <button
              onClick={() => onSelectedTagChange(null)}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 cursor-pointer transition-colors"
            >
              Limpar ({selectedTag}) ✕
            </button>
          )}
          {allAvailableTags.slice(0, 10).map((t) => (
            <button
              key={t}
              onClick={() => onSelectedTagChange(selectedTag === t ? null : t)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                selectedTag === t
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
