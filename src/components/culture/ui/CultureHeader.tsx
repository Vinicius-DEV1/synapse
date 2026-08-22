import React from 'react';
import { Plus, Search, LayoutGrid, AlignJustify, Rows3, ArrowUpDown, Target } from 'lucide-react';
import { SORT_OPTIONS, type SortMode, type FilterType } from '../hooks/useCulture';

interface CultureHeaderProps {
  search: string;
  setSearch: (s: string) => void;
  activeFilter: FilterType;
  setActiveFilter: (f: FilterType) => void;
  viewMode: 'grid' | 'compact' | 'list';
  setViewMode: (m: 'grid' | 'compact' | 'list') => void;
  sortMode: SortMode;
  setSortMode: (s: SortMode) => void;
  showGoalsSection: boolean;
  toggleGoalsSection: () => void;
  onOpenAddModal: () => void;
}

export function CultureHeader({
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
  onOpenAddModal,
}: CultureHeaderProps) {
  return (
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
            onClick={onOpenAddModal}
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
  );
}
