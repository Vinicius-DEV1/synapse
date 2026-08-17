import type { CultureSearchResult } from '../../../services/culture-apis';

interface CultureSearchResultsListProps {
  searchResults: CultureSearchResult[];
  onSelectResult: (result: CultureSearchResult) => void;
}

export function CultureSearchResultsList({ searchResults, onSelectResult }: CultureSearchResultsListProps) {
  if (searchResults.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2 max-h-48 overflow-y-auto scrollbar-custom border-t border-white/10 pt-2">
      {searchResults.map((res, i) => (
        <div
          key={i}
          onClick={() => onSelectResult(res)}
          className="flex gap-3 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/5 items-center"
        >
          {res.cover && (
            <img src={res.cover} alt={res.title} className="w-8 h-12 object-cover rounded bg-black/40" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-white">{res.title}</p>
            <p className="text-xs text-white/50 truncate">{res.synopsis || 'Sem sinopse'}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded">
            {res.type}
          </span>
        </div>
      ))}
    </div>
  );
}
