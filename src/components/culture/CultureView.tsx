import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Calendar, LayoutGrid, AlignJustify, Rows3, ChevronUp, ChevronDown, ArrowUpDown, Target } from 'lucide-react';
import type { CultureItem } from '../../types';
import { CultureService } from '../../services/culture';
import CultureMediaCard from './CultureMediaCard';
import CultureAddModal from './CultureAddModal';
import CultureViewModal from './CultureViewModal';
import CultureGoalModal from './CultureGoalModal';
import { useCulture, TYPE_LABELS, sortItems, SORT_OPTIONS, type SortMode } from './hooks/useCulture';

export default function CultureView() {
  const {
    items,
    recentReleases,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    isLoading,
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
    
    // tipos fora da ordem salva (excluding goals already handled)
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

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso));
    } catch { return 'Recente'; }
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

      {/* ── Header ── */}
      <div className="flex-none px-6 pt-6 pb-4 border-b border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Área Cultura</h1>
          <div className="flex items-center gap-2 flex-wrap">

            {/* Sort dropdown */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown size={13} className="text-dark-subtext flex-shrink-0" />
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="bg-transparent text-xs text-dark-subtext focus:outline-none cursor-pointer hover:text-dark-text transition-colors pr-1"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-dark-card text-dark-text">{o.label}</option>
                ))}
              </select>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1.5 border-r border-white/10 pr-3 mr-1">
              <button
                onClick={toggleGoalsSection}
                title={showGoalsSection ? "Ocultar seção de Objetivos" : "Mostrar seção de Objetivos"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  showGoalsSection 
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/30 hover:bg-brand-500/30' 
                    : 'bg-white/5 text-dark-subtext border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <Target size={13} />
                <span className="hidden sm:inline">Objetivos</span>
              </button>
            </div>

            <div className="flex bg-dark-card border border-white/10 rounded-lg p-0.5">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
                title="Grade"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'compact' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
                title="Compacto"
              >
                <Rows3 size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
                title="Lista"
              >
                <AlignJustify size={16} />
              </button>
            </div>
            
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-all"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar título ou sinopse..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
            {(['all', 'goals', 'finished', 'anime', 'filme', 'série', 'hq', 'manga', 'livro', 'novel'] as FilterType[]).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-white/5 text-dark-subtext border border-transparent hover:bg-white/10 hover:text-dark-text'
                }`}
              >
                {filter === 'all' ? 'Tudo' : filter === 'goals' ? 'Objetivos' : filter === 'finished' ? 'Finalizados' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lançamentos da Semana ── */}
      {recentReleases.length > 0 && (
        <div className="mx-6 mt-5 bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
            <Calendar size={16} />
            <span>Lançamentos da Semana</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-custom pb-2">
            {recentReleases.map(ep => (
              <div
                key={ep.id}
                onClick={() => { const it = items.find(i => i.id === ep.item_id); if (it) setEditingItem(it); }}
                className="flex-shrink-0 w-64 bg-black/20 rounded-xl p-3 border border-white/5 flex gap-3 items-center hover:bg-white/5 transition-colors cursor-pointer"
              >
                {ep.item_cover && <img src={ep.item_cover} alt="cover" className="w-10 h-14 object-cover rounded shadow" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{ep.item_title}</div>
                  <div className="text-xs text-white/50 truncate">EP {ep.episode_number}: {ep.title}</div>
                  <div className="text-[10px] text-brand-400 mt-1">{ep.aired_at ? formatDate(ep.aired_at) : 'Recente'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          onAdd={loadData}
          editItem={editingItem}
        />
      )}
      
      {viewingItem && (
        <CultureViewModal
          isOpen={!!viewingItem}
          onClose={handleCloseViewModal}
          item={viewingItem}
          onUpdate={loadData}
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
