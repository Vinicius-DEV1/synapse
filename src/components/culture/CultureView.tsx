import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import type { CultureItem } from '../../types';
import { CultureService } from '../../services/culture';
import CultureMediaCard from './CultureMediaCard';
import CultureAddModal from './CultureAddModal';

type FilterType = 'all' | 'goals' | 'finished' | 'anime' | 'filme' | 'série' | 'hq' | 'manga' | 'livro' | 'novel';

export default function CultureView() {
  const [items, setItems] = useState<CultureItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CultureItem | null>(null);

  const loadItems = async () => {
    try {
      const data = await CultureService.getItems();
      setItems(data);
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
