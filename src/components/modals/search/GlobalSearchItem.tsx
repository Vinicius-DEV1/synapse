import React from 'react';
import { ChevronRight, Pin, Clock, CornerDownLeft } from 'lucide-react';
import type { SearchResultItem } from './search-utils';
import { HighlightedText } from './SearchHighlight';

interface GlobalSearchItemProps {
  page: SearchResultItem;
  isSelected: boolean;
  debouncedQuery: string;
  onSelect: (pageId: string, isNewTab: boolean) => void;
  onMouseEnter: () => void;
  getSnippet: (content: string | undefined, queryStr: string) => React.ReactNode;
}

export function GlobalSearchItem({
  page,
  isSelected,
  debouncedQuery,
  onSelect,
  onMouseEnter,
  getSnippet,
}: GlobalSearchItemProps) {
  return (
    <button
      onClick={e => {
        if (e.ctrlKey || e.metaKey) {
          onSelect(page.id, true);
        } else {
          onSelect(page.id, false);
        }
      }}
      onAuxClick={e => {
        if (e.button === 1) {
          e.preventDefault();
          onSelect(page.id, true);
        }
      }}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-brand-500/15 border border-brand-500/35 shadow-[0_2px_12px_rgba(139,92,246,0.12)]'
          : 'hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base transition-colors ${
          isSelected
            ? 'bg-brand-500/25 border border-brand-500/40 text-brand-200'
            : 'bg-white/5 border border-white/10 text-dark-text'
        }`}
      >
        {page.icon || '📄'}
      </div>

      {/* Content & Path */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumbs Ancestors */}
        {page.ancestors && page.ancestors.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-dark-subtext/75 font-normal truncate mb-0.5 leading-none">
            {page.ancestors.map(anc => (
              <span
                key={anc.id}
                className="flex items-center gap-1 shrink-0 max-w-[140px] truncate"
              >
                <span className="opacity-80 text-[10px]">{anc.icon || '📁'}</span>
                <HighlightedText
                  text={anc.title || 'Sem título'}
                  query={debouncedQuery}
                  className="truncate"
                />
                <ChevronRight
                  size={11}
                  className="text-dark-subtext/40 shrink-0 mx-0.5"
                />
              </span>
            ))}
          </div>
        )}

        {/* Main Title & Badges */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm truncate font-medium ${
              isSelected ? 'text-brand-200 font-semibold' : 'text-dark-text'
            }`}
          >
            <HighlightedText text={page.title || 'Sem título'} query={debouncedQuery} />
          </span>

          {/* Badges */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {page.is_pinned === 1 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                <Pin size={10} className="shrink-0" />
                <span>Fixada</span>
              </span>
            )}

            {page.matchType === 'title' && (
              <span className="text-[10px] uppercase tracking-wider text-brand-300 font-semibold bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 rounded-md">
                Título
              </span>
            )}

            {page.matchType === 'path' && (
              <span className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded-md">
                Caminho
              </span>
            )}

            {page.matchType === 'content' && (
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                Conteúdo
              </span>
            )}

            {page.isRecent && (
              <span className="flex items-center gap-0.5 text-[10px] text-dark-subtext/80 font-medium bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                <Clock size={10} className="shrink-0" />
                <span>Recente</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Snippet */}
        {page.matchType === 'content' && page.content && (
          <div className="mt-1 pl-1.5 border-l-2 border-emerald-500/30 py-0.5">
            {getSnippet(page.content, debouncedQuery)}
          </div>
        )}
      </div>

      {/* Action Indicator */}
      {isSelected && (
        <CornerDownLeft size={14} className="text-brand-400 shrink-0 opacity-80 pl-1" />
      )}
    </button>
  );
}
