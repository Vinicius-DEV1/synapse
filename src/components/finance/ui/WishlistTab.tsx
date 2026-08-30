import React from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2, Calendar } from 'lucide-react';
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
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center pb-1 border-b border-white/5">
        <span className="text-xs text-dark-subtext">
          {wishlist.length} {wishlist.length === 1 ? 'desejo cadastrado' : 'desejos cadastrados'}
        </span>
        <button
          onClick={onAddWishlist}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-600/20 active:scale-95"
        >
          <Plus size={14} />
          <span>Adicionar Desejo</span>
        </button>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center text-dark-subtext py-12 bg-dark-bg/30 border border-white/5 rounded-xl text-xs">
          Lista de desejos vazia.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
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
                <div key={category} className="flex flex-col gap-1.5">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between text-left group w-full px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-dark-text">
                      {isCollapsed ? (
                        <ChevronRight size={15} className="text-dark-subtext" />
                      ) : (
                        <ChevronDown size={15} className="text-dark-subtext" />
                      )}
                      <span>{category}</span>
                      <span className="text-[11px] font-normal text-dark-subtext bg-white/5 px-2 py-0.2 rounded-full">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-dark-subtext group-hover:text-dark-text transition-colors">
                      R$ {totalCategory.toFixed(2)}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="flex flex-col gap-1 pl-1.5 border-l border-white/5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectWishlist(item)}
                          className="bg-dark-bg/70 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg px-3 py-2 flex items-center justify-between gap-3 group cursor-pointer transition-all active:scale-[0.99]"
                        >
                          {/* Item title with ellipsis and tooltip */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="font-medium text-dark-text text-xs sm:text-sm truncate"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                            {item.expected_date && (
                              <span
                                className="hidden sm:flex items-center gap-1 text-[11px] text-dark-subtext flex-shrink-0"
                                title={`Meta: ${formatDateSafe(item.expected_date)}`}
                              >
                                <Calendar size={11} className="text-dark-subtext/70" />
                                <span>{formatDateSafe(item.expected_date)}</span>
                              </span>
                            )}
                          </div>

                          {/* Right side: Priority Badge, Price, and Delete Action */}
                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
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

                            <span className="text-xs sm:text-sm font-bold text-brand-400 min-w-[70px] text-right">
                              R$ {Number(item.price || 0).toFixed(2)}
                            </span>

                            <button
                              onClick={(e) => onDeleteWishlist(item.id, e)}
                              className="p-1 text-dark-subtext opacity-60 group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                              title="Excluir Desejo"
                            >
                              <Trash2 size={14} />
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

