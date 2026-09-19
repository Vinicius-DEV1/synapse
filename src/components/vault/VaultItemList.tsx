import { Search, Plus, Key, Star, GripVertical } from 'lucide-react';
import type { VaultItem } from '../../types';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface VaultItemListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredItems: VaultItem[];
  selectedItem: VaultItem | null;
  isLoading: boolean;
  handleSelectItem: (item: VaultItem) => void;
  onReorderItems?: (sourceIndex: number, targetIndex: number) => void;
  onNewItem: () => void;
}

interface SortableVaultItemProps {
  item: VaultItem;
  isSelected: boolean;
  onSelect: (item: VaultItem) => void;
  isDragDisabled?: boolean;
}

function SortableVaultItem({ item, isSelected, onSelect, isDragDisabled }: SortableVaultItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`vault-item-${item.id}`}
      onClick={() => onSelect(item)}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-all group select-none ${
        isSelected
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
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="text-dark-subtext/40 hover:text-white p-1 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Arrastar para reordenar"
        >
          <GripVertical size={14} />
        </button>
      </div>
    </div>
  );
}

export function VaultItemList({
  searchQuery,
  setSearchQuery,
  filteredItems,
  selectedItem,
  isLoading,
  handleSelectItem,
  onReorderItems,
  onNewItem,
}: VaultItemListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderItems) return;
    const oldIndex = filteredItems.findIndex((i) => i.id === active.id);
    const newIndex = filteredItems.findIndex((i) => i.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderItems(oldIndex, newIndex);
    }
  };

  const isDragDisabled = Boolean(searchQuery.trim());

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredItems.map((item) => (
                <SortableVaultItem
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={handleSelectItem}
                  isDragDisabled={isDragDisabled}
                />
              ))}
            </SortableContext>
          </DndContext>
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

