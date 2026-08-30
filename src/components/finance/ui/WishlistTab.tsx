import React from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { WishlistItem } from '../../../types';
import { formatDateSafe } from './TransactionList';

interface WishlistTabProps {
  wishlist: WishlistItem[];
  collapsedCategories: Record<string, boolean>;
  toggleCategory: (category: string) => void;
  onAddWishlist: () => void;
  onSelectWishlist: (item: WishlistItem) => void;
  onDeleteWishlist: (id: string, e?: React.MouseEvent) => void;
}

export function WishlistTab({
  wishlist,
  collapsedCategories,
  toggleCategory,
  onAddWishlist,
  onSelectWishlist,
  onDeleteWishlist,
}: WishlistTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end mb-1">
        <button
          onClick={onAddWishlist}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-600/20 active:scale-95"
        >
          <Plus size={14} />
          <span>Adicionar Desejo</span>
        </button>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center text-dark-subtext py-12 bg-dark-bg/30 border border-white/5 rounded-xl">
          Lista de desejos vazia.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(
            wishlist.reduce((acc, item) => {
              const cat = item.category || 'Geral';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {} as Record<string, WishlistItem[]>)
          )
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([category, items]) => {
              const isCollapsed = collapsedCategories[category] !== false;
              const totalCategory = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

              return (
                <div key={category} className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between text-left group w-full p-1.5 -mx-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-base font-semibold text-dark-text">
                      {isCollapsed ? (
                        <ChevronRight size={16} className="text-dark-subtext" />
                      ) : (
                        <ChevronDown size={16} className="text-dark-subtext" />
                      )}
                      {category}
                      <span className="text-[11px] font-normal text-dark-subtext bg-white/5 px-2 py-0.5 rounded-full ml-1.5">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-dark-subtext group-hover:text-dark-text transition-colors">
                      R$ {totalCategory.toFixed(2)}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="flex flex-col gap-2 pl-2 border-l border-white/5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectWishlist(item)}
                          className="bg-dark-bg/80 hover:bg-white/5 border border-white/5 rounded-xl p-3.5 flex justify-between items-center group cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col gap-1">
                            <h3 className="font-medium text-dark-text text-sm">{item.title}</h3>
                            <div className="flex items-center gap-2.5">
                              <span className="text-base font-bold text-brand-400">
                                R$ {Number(item.price || 0).toFixed(2)}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                                  item.priority === 'high'
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    : item.priority === 'medium'
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {item.priority === 'high'
                                  ? 'Alta'
                                  : item.priority === 'medium'
                                  ? 'Média'
                                  : 'Baixa'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.expected_date && (
                              <span className="text-xs text-dark-subtext">
                                Meta: {formatDateSafe(item.expected_date)}
                              </span>
                            )}
                            <button
                              onClick={(e) => onDeleteWishlist(item.id, e)}
                              className="p-1.5 text-dark-subtext opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-white/5 rounded transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

