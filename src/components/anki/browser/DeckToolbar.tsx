import { Search, Filter, Trash2, LayoutGrid, LayoutList, Table } from 'lucide-react';
import type { Deck } from '../types';

export interface DeckFilters {
  type: string;
  validation: string;
  media: string;
  state: string;
  deck: string;
  tag: string;
}

interface DeckToolbarProps {
  deck: Deck;
  decks: Deck[];
  allTags: string[];
  
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  
  filters: DeckFilters;
  setFilters: (filters: DeckFilters) => void;
  
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  
  viewMode: 'table' | 'grid' | 'list';
  setViewMode: (mode: 'table' | 'grid' | 'list') => void;
  
  selectedIds: Set<string>;
  handleDeleteSelected: () => void;
  handleMoveSelected: (targetDeckId: string) => void;
  
  setIsCreatingCard: (isCreating: boolean) => void;
}

export function DeckToolbar({
  deck, decks, allTags,
  searchQuery, setSearchQuery,
  filters, setFilters,
  showFilters, setShowFilters,
  viewMode, setViewMode,
  selectedIds, handleDeleteSelected, handleMoveSelected,
  setIsCreatingCard
}: DeckToolbarProps) {
  
  return (
    <div className="sticky top-0 z-20 p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-dark-card/95 backdrop-blur-md shrink-0 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <button 
          onClick={() => setShowFilters(!showFilters)} 
          className={`p-2 rounded-xl transition-colors border ${showFilters ? 'bg-white/10 border-white/20 text-indigo-400' : 'bg-dark-card border-white/5 text-dark-subtext hover:bg-white/5 hover:text-white'}`}
          title="Mostrar/Ocultar Filtros"
        >
          <Filter size={18} />
        </button>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-subtext" />
          <input 
            type="text" 
            placeholder="Buscar cartões..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text focus:outline-none focus:border-white/10 transition-all placeholder-dark-subtext/50"
          />
        </div>
        
        {showFilters && (
          <>
            <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
              <option className="bg-dark-bg text-white" value="all">Tipos (Todos)</option>
              <option className="bg-dark-bg text-white" value="reading">Leitura</option>
              <option className="bg-dark-bg text-white" value="listening">Escuta</option>
              <option className="bg-dark-bg text-white" value="typing">Digitação</option>
              <option className="bg-dark-bg text-white" value="cloze">Completar (Cloze)</option>
            </select>

            <select value={filters.validation} onChange={e => setFilters({...filters, validation: e.target.value})} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
              <option className="bg-dark-bg text-white" value="all">Validação (Todas)</option>
              <option className="bg-dark-bg text-white" value="exact">Exata</option>
              <option className="bg-dark-bg text-white" value="ai">Com IA</option>
            </select>

            <select value={filters.media} onChange={e => setFilters({...filters, media: e.target.value})} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
              <option className="bg-dark-bg text-white" value="all">Mídia (Ambos)</option>
              <option className="bg-dark-bg text-white" value="with_media">Com Áudio</option>
              <option className="bg-dark-bg text-white" value="without_media">Sem Áudio</option>
            </select>

            <select value={filters.state} onChange={e => setFilters({...filters, state: e.target.value})} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
              <option className="bg-dark-bg text-white" value="all">Estado (Todos)</option>
              <option className="bg-dark-bg text-white" value="new">Novos</option>
              <option className="bg-dark-bg text-white" value="learning">Aprendendo</option>
              <option className="bg-dark-bg text-white" value="review">Revisão</option>
            </select>

            <select value={filters.deck} onChange={e => setFilters({...filters, deck: e.target.value})} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors max-w-[150px] truncate">
              <option className="bg-dark-bg text-white" value="all">Baralho (Todos)</option>
              {decks.filter(d => d.id === deck.id || d.parent_id === deck.id).map(d => (
                <option className="bg-dark-bg text-white" key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {allTags.length > 0 && (
              <select value={filters.tag} onChange={e => setFilters({...filters, tag: e.target.value})} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors max-w-[150px] truncate">
                <option className="bg-dark-bg text-white" value="all">Tags (Todas)</option>
                {allTags.map(tag => (
                  <option className="bg-dark-bg text-white" key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            )}
          </>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 border-r border-white/10 pr-3">
            <span className="text-sm text-indigo-400 font-medium">{selectedIds.size} selecionados</span>
            
            <select
               className="bg-dark-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-dark-text focus:outline-none cursor-pointer max-w-[150px] truncate"
               onChange={(e) => {
                 if (e.target.value) {
                   handleMoveSelected(e.target.value);
                   e.target.value = '';
                 }
               }}
               value=""
            >
               <option className="bg-dark-bg text-white" value="" disabled>Mover para...</option>
               {decks.map(d => (
                   <option className="bg-dark-bg text-white" key={d.id} value={d.id}>{d.name}</option>
               ))}
            </select>

            <button onClick={handleDeleteSelected} className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-sm transition-colors">
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        )}
        
        <div className="flex bg-dark-bg border border-white/5 rounded-lg p-0.5">
          <button 
            onClick={() => setViewMode('table')} 
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
            title="Visualização em Tabela (Densa)"
          >
            <Table size={16} />
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
            title="Lista Expandida"
          >
            <LayoutList size={16} />
          </button>
          <button 
            onClick={() => setViewMode('grid')} 
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
            title="Grade Expandida"
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        <button 
          onClick={() => setIsCreatingCard(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          Novo Cartão
        </button>
      </div>
    </div>
  );
}
