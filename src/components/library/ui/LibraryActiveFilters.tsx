import { X, RotateCcw, Filter } from 'lucide-react';
import type { LibraryCollection, ReadingStatus, BookFormatFilter, BookArchiveFilter } from '../../../types';

interface LibraryActiveFiltersProps {
  searchQuery: string;
  onClearSearch: () => void;
  statusFilter: ReadingStatus | 'all';
  onClearStatus: () => void;
  selectedCollection: string | null;
  collections: LibraryCollection[];
  onClearCollection: () => void;
  selectedAuthor: string | null;
  onClearAuthor: () => void;
  formatFilter: BookFormatFilter;
  onClearFormat: () => void;
  archiveFilter: BookArchiveFilter;
  onClearArchive: () => void;
  totalBooks: number;
  filteredBooks: number;
  onClearAll: () => void;
}

const STATUS_LABELS: Record<ReadingStatus, string> = {
  not_started: 'Não iniciados',
  reading: 'Lendo',
  finished: 'Concluídos',
};

export function LibraryActiveFilters({
  searchQuery,
  onClearSearch,
  statusFilter,
  onClearStatus,
  selectedCollection,
  collections,
  onClearCollection,
  selectedAuthor,
  onClearAuthor,
  formatFilter,
  onClearFormat,
  archiveFilter,
  onClearArchive,
  totalBooks,
  filteredBooks,
  onClearAll,
}: LibraryActiveFiltersProps) {
  const collectionObj = selectedCollection
    ? collections.find((c) => c.id === selectedCollection)
    : null;

  const hasAnyFilter = Boolean(
    searchQuery.trim() ||
      statusFilter !== 'all' ||
      selectedCollection ||
      selectedAuthor ||
      formatFilter !== 'all' ||
      archiveFilter !== 'active'
  );

  if (!hasAnyFilter) {
    return null;
  }

  return (
    <div className="px-6 py-2.5 bg-dark-card/50 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap text-xs">
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <span className="flex items-center gap-1.5 text-dark-subtext font-medium mr-1">
          <Filter size={13} className="text-brand-400" />
          Filtros ativos:
        </span>

        {/* Search */}
        {searchQuery.trim() && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300">
            <span>Busca: &ldquo;{searchQuery}&rdquo;</span>
            <button
              onClick={onClearSearch}
              className="hover:text-white transition-colors"
              title="Remover filtro de busca"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {/* Status */}
        {statusFilter !== 'all' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/90">
            <span>Status: {STATUS_LABELS[statusFilter]}</span>
            <button
              onClick={onClearStatus}
              className="hover:text-white transition-colors text-white/50"
              title="Remover filtro de status"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {/* Collection */}
        {collectionObj && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border"
            style={{
              backgroundColor: `${collectionObj.color}20`,
              color: collectionObj.color,
              borderColor: `${collectionObj.color}40`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: collectionObj.color }}
            />
            <span>Coleção: {collectionObj.name}</span>
            <button
              onClick={onClearCollection}
              className="hover:opacity-75 transition-opacity"
              title="Remover filtro de coleção"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {/* Author */}
        {selectedAuthor && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/90">
            <span>Autor: {selectedAuthor}</span>
            <button
              onClick={onClearAuthor}
              className="hover:text-white transition-colors text-white/50"
              title="Remover filtro de autor"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {/* Format */}
        {formatFilter !== 'all' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/90 uppercase font-semibold text-[10px]">
            <span>Formato: {formatFilter}</span>
            <button
              onClick={onClearFormat}
              className="hover:text-white transition-colors text-white/50"
              title="Remover filtro de formato"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {/* Archive */}
        {archiveFilter === 'archived' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <span>Visualizando: Arquivados</span>
            <button
              onClick={onClearArchive}
              className="hover:text-white transition-colors text-amber-200"
              title="Voltar para livros ativos"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {/* Clear All Button */}
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-colors ml-1 font-medium"
        >
          <RotateCcw size={11} />
          Limpar filtros
        </button>
      </div>

      {/* Results counter */}
      <span className="text-dark-subtext text-xs whitespace-nowrap">
        {filteredBooks} de {totalBooks} {totalBooks === 1 ? 'livro' : 'livros'}
      </span>
    </div>
  );
}
