import { Search, Plus, Key, Star, GripVertical } from 'lucide-react';
import type { VaultItem } from '../../types';

interface VaultItemListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredItems: VaultItem[];
  selectedItem: VaultItem | null;
  isLoading: boolean;
  handleSelectItem: (item: VaultItem) => void;
  onNewItem: () => void;
}

export function VaultItemList({
  searchQuery,
  setSearchQuery,
  filteredItems,
  selectedItem,
  isLoading,
  handleSelectItem,
  onNewItem,
}: VaultItemListProps) {
  return (
    <div className="w-80 border-r border-white/5 bg-dark-card/50 flex flex-col relative">
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-bg border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center py-10 text-dark-subtext text-sm">Carregando...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 text-dark-subtext text-sm">Nenhum item encontrado</div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              data-testid={`vault-item-${item.id}`}
              onClick={() => handleSelectItem(item)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-all group ${
                selectedItem?.id === item.id
                  ? 'bg-brand-500/20 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center flex-shrink-0 text-brand-400">
                <Key size={18} />
              </div>
              <div className="overflow-hidden flex-1">
                <div className="font-medium text-sm truncate text-dark-text">{item.label}</div>
                <div className="text-xs text-dark-subtext truncate">{item.username || item.email || 'Sem usuário'}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.is_favorite === 1 && (
                  <Star size={12} className="text-yellow-500 flex-shrink-0" fill="currentColor" />
                )}
                <span className="text-dark-subtext/30 opacity-0 group-hover:opacity-100">
                  <GripVertical size={12} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={onNewItem}
          className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={16} />
          <span>Novo Item</span>
        </button>
      </div>
    </div>
  );
}
