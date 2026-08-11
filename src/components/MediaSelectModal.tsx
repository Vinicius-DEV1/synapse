import React, { useState, useEffect } from 'react';
import { Film, BookOpen, Search, X, Loader2 } from 'lucide-react';

interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'book';
  cover?: string;
  author?: string;
  duration?: number;
}

interface MediaSelectModalProps {
  isOpen: boolean;
  type: 'video' | 'book';
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}

export default function MediaSelectModal({ isOpen, type, onClose, onSelect }: MediaSelectModalProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen, type]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      if (type === 'video' && window.api?.sync) {
        const rows = await window.api.sync.getTable('videos');
        const videos = (rows as any[]).filter((v: any) => !v.deleted_at).map(v => ({
          id: v.id,
          title: v.title,
          type: 'video' as const,
          cover: v.thumbnail_url,
          duration: v.duration
        }));
        setItems(videos);
      } else if (type === 'book' && window.api?.library) {
        const rows = await window.api.library.getBooks();
        const books = (rows as any[]).map(b => ({
          id: b.id,
          title: b.title,
          type: 'book' as const,
          cover: b.cover_image,
          author: b.author
        }));
        setItems(books);
      }
    } catch (e) {
      console.error('Failed to load media:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    (item.author && item.author.toLowerCase().includes(search.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" contentEditable={false}>
      <div 
        className="bg-dark-card border border-white/10 rounded-xl shadow-2xl flex flex-col w-full max-w-md max-h-[80vh] overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-white font-medium flex items-center gap-2">
            {type === 'video' ? <Film size={18} className="text-purple-400" /> : <BookOpen size={18} className="text-blue-400" />}
            Vincular {type === 'video' ? 'Vídeo' : 'Livro'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-dark-subtext hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" />
            <input 
              type="text"
              autoFocus
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-dark-subtext focus:outline-none focus:border-brand-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-dark-subtext">
              <Loader2 size={24} className="animate-spin mb-2" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-dark-subtext">
              <span className="text-sm">Nenhum resultado encontrado.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded overflow-hidden bg-dark-bg border border-white/10 flex items-center justify-center shrink-0">
                    {item.cover ? (
                      <img src={item.cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      type === 'video' ? <Film size={20} className="text-white/20" /> : <BookOpen size={20} className="text-white/20" />
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm text-white font-medium truncate">{item.title}</span>
                    <span className="text-xs text-dark-subtext truncate">
                      {item.author || (item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
