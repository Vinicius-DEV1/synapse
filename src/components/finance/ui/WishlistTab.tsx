import React from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { WishlistItem } from '../../../types';

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
    <div className="flex flex-col gap-6">
      <div className="flex justify-end mb-2">
        <button
          onClick={onAddWishlist}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-dark-text transition-all"
        >
          <Plus size={14} />
          <span>Adicionar Desejo</span>
        </button>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center text-dark-subtext py-12">Lista de desejos vazia.</div>
      ) : (
        <div className="flex flex-col gap-6">
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
              const totalCategory = items.reduce((acc, item) => acc + (item.price || 0), 0);

              return (
                <div key={category} className="flex flex-col gap-3">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between text-left group w-full p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-lg font-semibold text-dark-text">
                      {isCollapsed ? (
                        <ChevronRight size={18} className="text-dark-subtext" />
                      ) : (
                        <ChevronDown size={18} className="text-dark-subtext" />
                      )}
                      {category}
                      <span className="text-xs font-normal text-dark-subtext bg-white/5 px-2 py-0.5 rounded-full ml-2">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-dark-subtext group-hover:text-dark-text transition-colors">
                      R$ {totalCategory.toFixed(2)}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="flex flex-col gap-3 pl-2 border-l border-white/5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectWishlist(item)}
                          className="bg-dark-bg hover:bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center group cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col gap-1">
                            <h3 className="font-medium text-dark-text">{item.title}</h3>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold text-brand-400">
                                R$ {item.price?.toFixed(2) ?? '0.00'}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  item.priority === 'high'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : item.priority === 'medium'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
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
                          <div className="flex items-center gap-4">
                            {item.expected_date && (
                              <span className="text-xs text-dark-subtext">
                                Meta: {new Date(item.expected_date).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            <button
                              onClick={(e) => onDeleteWishlist(item.id, e)}
                              className="p-2 text-dark-subtext opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5 rounded transition-all"
                            >
                              <Trash2 size={18} />
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
