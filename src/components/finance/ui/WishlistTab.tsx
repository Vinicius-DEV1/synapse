import React, { useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2, Calendar, Gift, CheckCircle2 } from 'lucide-react';
import type { WishlistItem } from '../../../types';
import { formatDateSafe } from './TransactionList';
import { useTranslation } from '../../../i18n';
import { formatCurrency } from '../utils/formatCurrency';

interface WishlistTabProps {
  wishlist: WishlistItem[];
  collapsedCategories: Record<string, boolean>;
  toggleCategory: (category: string) => void;
  onAddWishlist: () => void;
  onSelectWishlist: (item: WishlistItem) => void;
  onDeleteWishlist: (id: string, e?: React.MouseEvent) => void;
  onAcquireWishlist?: (item: WishlistItem, e?: React.MouseEvent) => void;
}

export function WishlistTab({
  wishlist,
  collapsedCategories,
  toggleCategory,
  onAddWishlist,
  onSelectWishlist,
  onDeleteWishlist,
  onAcquireWishlist,
}: WishlistTabProps) {
  const { t } = useTranslation();

  const categorizedWishlist = useMemo(() => {
    const map: Record<string, WishlistItem[]> = {};
    for (const item of wishlist) {
      const cat = item.category || 'Geral';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [wishlist]);

  return (
    <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex justify-between items-center pb-3 border-b border-white/5">
        <div>
          <h2 className="text-sm font-semibold text-dark-text tracking-tight flex items-center gap-2">
            <Gift size={16} className="text-brand-400" />
            <span>{t('finance.wishlist', 'Lista de Desejos & Metas Futuras')}</span>
          </h2>
          <p className="text-xs text-dark-subtext mt-0.5">
            {wishlist.length} {wishlist.length === 1 ? 'desejo cadastrado' : 'desejos cadastrados'}
          </p>
        </div>
        <button
          onClick={onAddWishlist}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-600/20 active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>{t('finance.addWishlist', 'Adicionar Desejo')}</span>
        </button>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center text-dark-subtext py-12 flex flex-col items-center justify-center gap-2">
          <Gift size={28} className="text-dark-subtext/30 mb-1" />
          <p className="text-sm font-medium text-dark-text">
            {t('finance.emptyWishlist', 'Lista de desejos vazia.')}
          </p>
          <p className="text-xs text-dark-subtext">
            Adicione compras planejadas, metas materiais ou projetos futuros.
          </p>
          <button
            onClick={onAddWishlist}
            className="mt-2 text-xs text-brand-400 hover:underline cursor-pointer font-medium"
          >
            Cadastrar primeiro desejo agora
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categorizedWishlist.map(([category, items]) => {
            const isCollapsed = collapsedCategories[category] !== false;
            const totalCategory = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

            return (
              <div key={category} className="flex flex-col gap-1.5 bg-dark-bg/40 border border-white/5 rounded-xl p-2.5">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between text-left group w-full px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-dark-text">
                    {isCollapsed ? (
                      <ChevronRight size={15} className="text-dark-subtext" />
                    ) : (
                      <ChevronDown size={15} className="text-dark-subtext" />
                    )}
                    <span>{category}</span>
                    <span className="text-[11px] font-normal text-dark-subtext bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-dark-subtext group-hover:text-dark-text transition-colors">
                    {formatCurrency(totalCategory)}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="flex flex-col gap-1.5 pt-1 pl-2 pr-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectWishlist(item)}
                        style={{ contain: 'layout style' }}
                        className="bg-dark-card/90 hover:bg-white/[0.04] border border-white/[0.06] hover:border-brand-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 group cursor-pointer transition-colors duration-150 shadow-sm"
                      >
                        {/* Item title with ellipsis and tooltip */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className="font-medium text-dark-text text-xs sm:text-sm truncate"
                            title={item.title}
                          >
                            {item.title}
                          </span>
                          {item.expected_date && (
                            <span
                              className="flex items-center gap-1 text-[11px] text-dark-subtext flex-shrink-0 bg-white/5 px-2 py-0.5 rounded-md border border-white/5"
                              title={`Meta: ${formatDateSafe(item.expected_date)}`}
                            >
                              <Calendar size={11} className="text-dark-subtext/70" />
                              <span>{formatDateSafe(item.expected_date)}</span>
                            </span>
                          )}
                        </div>

                        {/* Right side: Priority Badge, Price, and Actions */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-semibold ${
                              item.priority === 'high'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : item.priority === 'medium'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {item.priority === 'high'
                              ? t('finance.highPriority', 'Alta')
                              : item.priority === 'medium'
                              ? t('finance.mediumPriority', 'Média')
                              : t('finance.lowPriority', 'Baixa')}
                          </span>

                          <span className="text-xs sm:text-sm font-bold text-brand-300 min-w-[70px] text-right">
                            {formatCurrency(Number(item.price || 0))}
                          </span>

                          {onAcquireWishlist && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcquireWishlist(item, e);
                              }}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors cursor-pointer"
                              title="Marcar como Adquirido e Registrar Gasto"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteWishlist(item.id, e);
                            }}
                            className="p-1.5 text-dark-subtext opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title={t('finance.deleteWishlist', 'Excluir Desejo')}
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
