import { Check, AlertCircle } from 'lucide-react';
import type { Page } from '../../../types';

export interface FilteredPageItem {
  page: Page;
  breadcrumb: string;
  isValid: boolean;
}

interface MovePageSearchResultsProps {
  filteredPages: FilteredPageItem[];
  searchQuery: string;
  effectiveSelectedId: string | null;
  currentParentId: string | null;
  onSelect: (pageId: string) => void;
  onSubmit: () => void;
}

export function MovePageSearchResults({
  filteredPages,
  searchQuery,
  effectiveSelectedId,
  currentParentId,
  onSelect,
  onSubmit,
}: MovePageSearchResultsProps) {
  if (filteredPages.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-dark-subtext">
        Nenhuma página correspondente a &ldquo;{searchQuery}&rdquo; encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-1">
      {filteredPages.map(({ page, breadcrumb, isValid }) => {
        const isSelected = effectiveSelectedId === page.id;
        const isCurrentParent = currentParentId === page.id;

        return (
          <div
            key={page.id}
            onClick={() => isValid && onSelect(page.id)}
            onDoubleClick={() => isValid && !isCurrentParent && onSubmit()}
            className={`flex items-center justify-between p-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
              !isValid
                ? 'opacity-35 cursor-not-allowed bg-transparent'
                : isSelected
                ? 'bg-brand-500/20 text-brand-300 font-medium border border-brand-500/30'
                : 'text-dark-text hover:bg-white/5 border border-transparent'
            }`}
            title={!isValid ? 'Não é possível mover para si mesma ou subpáginas' : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-lg shrink-0">{page.icon || '📄'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{page.title || 'Sem Título'}</span>
                  {isCurrentParent && (
                    <span className="text-[10px] bg-white/10 text-dark-subtext px-1.5 py-0.5 rounded font-normal shrink-0">
                      Local Atual
                    </span>
                  )}
                  {!isValid && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-normal shrink-0 flex items-center gap-1">
                      <AlertCircle size={10} /> Inválido
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-dark-subtext truncate mt-0.5">{breadcrumb}</p>
              </div>
            </div>

            {isSelected && <Check size={16} className="text-brand-400 shrink-0 ml-2" />}
          </div>
        );
      })}
    </div>
  );
}
