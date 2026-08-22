import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { CultureSearchResult } from '../../../services/culture/culture-apis';
import { CultureSearchResultsList } from './CultureSearchResultsList';

interface CultureApiSearchPanelProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  searchResults: CultureSearchResult[];
  onSearch: (query: string) => void;
  onSelectResult: (result: CultureSearchResult) => void;
}

export function CultureApiSearchPanel({
  searchQuery,
  setSearchQuery,
  isSearching,
  searchResults,
  onSearch,
  onSelectResult,
}: CultureApiSearchPanelProps) {
  return (
    <div className="text-white bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
      <label className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
        Busca Inteligente
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar título..."
          className="flex-1 text-white placeholder-white/40 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand-500/50"
        />
        <button
          onClick={() => onSearch(searchQuery)}
          disabled={isSearching}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          Buscar
        </button>
      </div>

      <CultureSearchResultsList
        searchResults={searchResults}
        onSelectResult={onSelectResult}
      />
    </div>
  );
}
