import { useState, useMemo } from 'react';
import { Filter, ChevronUp, ChevronDown } from 'lucide-react';
import type { CultureItem } from '../../types';
import { CultureService } from '../../services/culture';
import CultureMediaCard from './CultureMediaCard';
import CultureAddModal from './CultureAddModal';
import CultureViewModal from './CultureViewModal';
import CultureGoalModal from './CultureGoalModal';
import { useCulture, TYPE_LABELS, sortItems } from './hooks/useCulture';

import { CultureHeader } from './ui/CultureHeader';
import { CultureRecentReleases } from './ui/CultureRecentReleases';

export default function CultureView() {
  const {
    items,
    recentReleases,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    viewMode,
    setViewMode,
    sortMode,
    setSortMode,
    showGoalsSection,
    toggleGoalsSection,
    sectionOrder,
    moveSectionUp,
    moveSectionDown,
    filteredItems,
    loadData
  } = useCulture();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CultureItem | null>(null);
  const [viewingItem, setViewingItem] = useState<CultureItem | null>(null);
  const [goalModalItem, setGoalModalItem] = useState<CultureItem | null>(null);

  const groupedItems = useMemo(() => {
    if (activeFilter !== 'all') return null;
    const handled = new Set<string>();
    const groups: { type: string; label: string; items: CultureItem[]; isGoalSection?: boolean }[] = [];

    // Separate Goals into their own section at the top (if enabled)
    const goalItems = filteredItems.filter(i => i.is_goal && !(i.total_progress > 0 && i.progress >= i.total_progress));
    if (showGoalsSection && goalItems.length > 0) {
      groups.push({ 
        type: 'goals', 
        label: '🎯 Objetivos Ativos', 
        items: sortItems(goalItems, sortMode),
        isGoalSection: true
      });
      // Let's remove them from the type sections so they don't duplicate.
      goalItems.forEach(i => handled.add(i.id));
    }

    for (const type of sectionOrder) {
      const typeItems = filteredItems.filter(i => i.type === type && !handled.has(i.id));
      if (typeItems.length > 0) {
        groups.push({ type, label: TYPE_LABELS[type] || type, items: sortItems(typeItems, sortMode) });
        typeItems.forEach(i => handled.add(i.id));
      }
    }
    
    // items outside saved custom order (excluding goals already handled)
    const others = filteredItems.filter(i => !handled.has(i.id));
    if (others.length > 0) groups.push({ type: 'other', label: '📦 Outros', items: sortItems(others, sortMode) });
    return groups;
  }, [filteredItems, activeFilter, sectionOrder, sortMode, showGoalsSection]);

  const flatItems = useMemo(() => {
    if (activeFilter === 'all') return [];
    return sortItems(filteredItems, sortMode);
  }, [filteredItems, activeFilter, sortMode]);

  const handleEdit = (item: CultureItem) => { setEditingItem(item); setIsAddModalOpen(true); };
  const handleCloseModal = () => { setIsAddModalOpen(false); setEditingItem(null); };
  
  const handleView = (item: CultureItem) => { setViewingItem(item); };
  const handleCloseViewModal = () => { setViewingItem(null); };

  const handleEditGoalNote = (item: CultureItem) => { setGoalModalItem(item); };
  const handleCloseGoalModal = () => { setGoalModalItem(null); };
  const handleSaveGoalNote = async (note: string) => {
    if (goalModalItem) {
      try {
        await CultureService.updateItem(goalModalItem.id, { ...goalModalItem, is_goal: true, goal_note: note });
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const gridClass =
    viewMode === 'grid'    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5' :
    viewMode === 'compact' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3' :
                             'flex flex-col gap-1.5';

  const renderCards = (cardItems: CultureItem[]) =>
    cardItems.map(item => (
      <CultureMediaCard
        key={item.id}
        item={item}
        viewMode={viewMode}
        onUpdate={loadData}
        onClick={() => handleView(item)}
        onEdit={() => handleEdit(item)}
        onEditGoal={() => handleEditGoalNote(item)}
        hasNewRelease={recentReleases.some(ep => ep.item_id === item.id)}
      />
    ));

  const visibleGroupCount = groupedItems ? groupedItems.filter(g => g.type !== 'other').length : 0;

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text overflow-hidden relative">
      <CultureHeader
        search={search}
        setSearch={setSearch}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortMode={sortMode}
        setSortMode={setSortMode}
        showGoalsSection={showGoalsSection}
        toggleGoalsSection={toggleGoalsSection}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      <CultureRecentReleases
        recentReleases={recentReleases}
        items={items}
        onSelectItem={(it) => setEditingItem(it)}
      />

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dark-subtext gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Filter size={32} className="opacity-50" />
            </div>
            <p className="text-sm">Nenhuma obra encontrada para esta visualização.</p>
          </div>
        ) : activeFilter === 'all' && groupedItems ? (
          <div className="flex flex-col gap-8">
            {groupedItems.map((group, idx) => {
              const isOther = group.type === 'other';
              const isFirst = idx === 0;
              const isLast = isOther ? true : idx === visibleGroupCount - 1;
              return (
                <section key={group.type}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-base font-semibold text-dark-text tracking-tight">{group.label}</h2>
                    <span className="text-xs text-dark-subtext bg-white/5 px-2 py-0.5 rounded-full">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                    {/* Reorder arrows — only for named type sections (not goals, not others) */}
                    {!isOther && !group.isGoalSection && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveSectionUp(group.type)}
                          disabled={isFirst || (idx === 1 && groupedItems[0]?.isGoalSection)} // disable if it's right under goals
                          title="Mover seção para cima"
                          className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-0 disabled:cursor-not-allowed"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => moveSectionDown(group.type)}
                          disabled={isLast}
                          title="Mover seção para baixo"
                          className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-0 disabled:cursor-not-allowed"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={gridClass}>{renderCards(group.items)}</div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className={gridClass}>{renderCards(flatItems)}</div>
        )}
      </div>

      {isAddModalOpen && (
        <CultureAddModal
          isOpen={isAddModalOpen}
          onClose={handleCloseModal}
          onSuccess={loadData}
          itemToEdit={editingItem}
        />
      )}

      {viewingItem && (
        <CultureViewModal
          isOpen={!!viewingItem}
          onClose={handleCloseViewModal}
          item={viewingItem}
        />
      )}

      {goalModalItem && (
        <CultureGoalModal
          item={goalModalItem}
          isOpen={!!goalModalItem}
          onClose={handleCloseGoalModal}
          onSave={handleSaveGoalNote}
        />
      )}
    </div>
  );
}
