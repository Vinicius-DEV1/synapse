import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Calendar } from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';
import CultureMediaCard from './CultureMediaCard';
import CultureAddModal from './CultureAddModal';

type FilterType = 'all' | 'goals' | 'finished' | 'anime' | 'filme' | 'série' | 'hq' | 'manga' | 'livro' | 'novel';

export default function CultureView() {
  const [items, setItems] = useState<CultureItem[]>([]);
  const [recentReleases, setRecentReleases] = useState<(CultureEpisode & { item_title: string, item_cover: string })[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CultureItem | null>(null);

  const loadItems = async () => {
    try {
      const data = await CultureService.getItems();
      setItems(data);
      
      const releases = await CultureService.getRecentReleases();
      setRecentReleases(releases);

      // Background sync silencioso (se houver obras em andamento)
      CultureService.syncOngoingItems(data).then(() => {
        // Depois do sync terminar silenciosamente, checa se chegou release novo
        CultureService.getRecentReleases().then(newReleases => setRecentReleases(newReleases));
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadItems();
    // Escutar por trigger de sync caso venha do backend
    const removeListener = window.api?.onSyncTrigger?.(() => {
      loadItems();
    });
    return () => removeListener && removeListener();
  }, []);

  const filteredItems = items.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                        (item.synopsis && item.synopsis.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'goals') return item.is_goal === 1;
    if (activeFilter === 'finished') return item.total_progress > 0 && item.progress >= item.total_progress;
    
    return item.type === activeFilter;
  });

  const handleEdit = (item: CultureItem) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
    } catch { return 'Recente'; }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text overflow-hidden relative">
      {/* Header & Controls */}
      <div className="flex-none px-6 pt-6 pb-4 border-b border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Área Cultura</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-brand-500/20 active:scale-95"
          >
            <Plus size={16} />
            <span>Adicionar Obra</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar título ou sinopse..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
          
          {/* Filters */}
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
            {(['all', 'goals', 'finished', 'anime', 'filme', 'série', 'hq', 'manga', 'livro', 'novel'] as FilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter 
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
                    : 'bg-white/5 text-dark-subtext border border-transparent hover:bg-white/10 hover:text-dark-text'
                }`}
              >
                {filter === 'all' ? 'Tudo' : 
                 filter === 'goals' ? 'Objetivos' : 
                 filter === 'finished' ? 'Finalizados' : 
                 filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lançamentos Recentes */}
      {recentReleases.length > 0 && (
        <div className="mx-6 mt-6 bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
            <Calendar size={16} />
            <span>Lançamentos da Semana</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-custom pb-2">
            {recentReleases.map(ep => (
              <div key={ep.id} className="flex-shrink-0 w-64 bg-black/20 rounded-xl p-3 border border-white/5 flex gap-3 items-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => {
                const item = items.find(i => i.id === ep.item_id);
                if (item) setEditingItem(item); 
              }}>
                {ep.item_cover && <img src={ep.item_cover} alt="cover" className="w-10 h-14 object-cover rounded shadow" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{ep.item_title}</div>
                  <div className="text-xs text-white/50 truncate">EP {ep.episode_number}: {ep.title}</div>
                  <div className="text-[10px] text-brand-400 mt-1">
                    {ep.aired_at ? formatDate(ep.aired_at) : 'Recente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dark-subtext gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Filter size={32} className="opacity-50" />
            </div>
            <p className="text-sm">Nenhuma obra encontrada para esta visualização.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredItems.map(item => (
              <CultureMediaCard 
                key={item.id} 
                item={item} 
                onUpdate={loadItems} 
                onClick={() => handleEdit(item)} 
                hasNewRelease={recentReleases.some(ep => ep.item_id === item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <CultureAddModal 
          isOpen={isAddModalOpen} 
          onClose={handleCloseModal} 
          onSuccess={loadItems}
          itemToEdit={editingItem}
        />
      )}
    </div>
  );
}
