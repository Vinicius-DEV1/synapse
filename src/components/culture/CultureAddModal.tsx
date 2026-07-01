import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Save, Trash2 } from 'lucide-react';
import type { CultureItem, CultureType } from '../../types';
import { CultureService } from '../../services/culture';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit?: CultureItem | null;
}

const TYPES: { value: CultureType; label: string }[] = [
  { value: 'anime', label: 'Anime' },
  { value: 'filme', label: 'Filme' },
  { value: 'série', label: 'Série' },
  { value: 'hq', label: 'HQ/Comic' },
  { value: 'manga', label: 'Mangá' },
  { value: 'livro', label: 'Livro' },
  { value: 'novel', label: 'Novel' },
];

export default function CultureAddModal({ isOpen, onClose, onSuccess, itemToEdit }: Props) {
  const [formData, setFormData] = useState<Partial<CultureItem>>({
    title: '',
    type: 'filme',
    synopsis: '',
    cover_image: '',
    access_link: '',
    progress: 0,
    total_progress: 0,
    is_goal: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setFormData({ ...itemToEdit });
      setSearchQuery(itemToEdit.title);
    }
  }, [itemToEdit]);

  // Debounce search
  useEffect(() => {
    if (!searchQuery.trim() || itemToEdit) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, formData.type, itemToEdit]);

  if (!isOpen) return null;

  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    console.log(`[CultureAddModal] Iniciando busca inteligente por: "${queryToSearch}"`);

    try {
      const type = formData.type as string;
      let results: any[] = [];
           const fetchJikan = async (q: string, t: 'anime' | 'manga') => {
        try {
          const res = await fetch(`https://api.jikan.moe/v4/${t}?q=${encodeURIComponent(q)}&limit=3`);
          const data = await res.json();
          return (data?.data || []).map((item: any) => ({
            title: item.title,
            synopsis: item.synopsis || '',
            cover: item.images?.jpg?.large_image_url || '',
            total: item.episodes || item.chapters || 0,
            type: t,
            api_id: item.mal_id.toString(),
            api_source: 'jikan',
            status: item.status === 'Currently Airing' || item.status === 'Publishing' ? 'releasing' : (item.status === 'Finished Airing' || item.status === 'Finished' ? 'finished' : 'unknown')
          }));
        } catch { return []; }
      };

      const fetchBooks = async (q: string) => {
        try {
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3`);
          const data = await res.json();
          return (data.items || []).map((item: any) => ({
            title: item.volumeInfo.title,
            synopsis: item.volumeInfo.description || '',
            cover: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
            total: item.volumeInfo.pageCount || 0,
            type: 'livro',
            api_id: item.id,
            api_source: 'books',
            status: 'finished'
          }));
        } catch { return []; }
      };

      const fetchTVMaze = async (q: string) => {
        try {
          const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          return (data || []).slice(0, 3).map((item: any) => ({
            title: item.show.name,
            synopsis: (item.show.summary || '').replace(/<[^>]+>/g, ''),
            cover: item.show.image?.medium || '',
            total: 0,
            type: 'série',
            api_id: item.show.id.toString(),
            api_source: 'tvmaze',
            status: item.show.status === 'Running' ? 'releasing' : (item.show.status === 'Ended' ? 'finished' : 'unknown')
          }));
        } catch { return []; }
      };  };

      const fetchITunesMovies = async (q: string) => {
        try {
          const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=15`);
          const data = await res.json();
          const movies = (data?.results || []).filter((r: any) => r.kind === 'feature-movie').slice(0, 3);
          return movies.map((item: any) => ({
            title: item.trackName,
            synopsis: item.longDescription || item.shortDescription || '',
            cover: item.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
            total: 0,
            type: 'filme',
            api_id: item.trackId.toString(),
            api_source: 'itunes'
          }));
        } catch { return []; }
      };

      if (type === 'todos') {
        const [animes, mangas, books, shows, movies] = await Promise.all([
          fetchJikan(queryToSearch, 'anime'),
          fetchJikan(queryToSearch, 'manga'),
          fetchBooks(queryToSearch),
          fetchTVMaze(queryToSearch),
          fetchITunesMovies(queryToSearch)
        ]);
        results = [...shows, ...movies, ...animes, ...mangas, ...books];
      } 
      else if (type === 'anime' || type === 'manga') {
        results = await fetchJikan(queryToSearch, type as 'anime' | 'manga');
      } 
      else if (type === 'livro' || type === 'novel' || type === 'hq') {
        results = await fetchBooks(queryToSearch);
        results.forEach(r => r.type = type);
      } 
      else if (type === 'série') {
        results = await fetchTVMaze(queryToSearch);
      }
      else if (type === 'filme') {
        results = await fetchITunesMovies(queryToSearch);
      }

      console.log(`[CultureAddModal] Encontrados ${results.length} resultados no total`);
      setSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('[CultureAddModal] Erro detalhado na busca inteligente:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const applyResult = (result: any) => {
    setFormData(prev => ({
      ...prev,
      title: result.title,
      synopsis: result.synopsis,
      cover_image: result.cover,
      total_progress: result.total > 0 ? result.total : prev.total_progress,
      type: result.type,
      api_id: result.api_id,
      api_source: result.api_source,
      status: result.status || 'unknown'
    }));
    setSearchResults([]);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    if (formData.type === 'todos' as any) {
      alert("Por favor, selecione um tipo de mídia específico (Anime, Filme, etc) antes de salvar.");
      return;
    }
    
    setIsSaving(true);
    try {
      if (itemToEdit) {
        await CultureService.updateItem(itemToEdit.id, formData);
      } else {
        await CultureService.createItem(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToEdit || !window.confirm('Tem certeza que deseja excluir esta obra?')) return;
    setIsSaving(true);
    try {
      await CultureService.deleteItem(itemToEdit.id);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold text-dark-text">
            {itemToEdit ? 'Editar Obra' : 'Nova Obra'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-dark-subtext transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-custom flex flex-col gap-6">
          
          {!itemToEdit && (
            <div className="text-white bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
              <label className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Busca Inteligente</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Interstellar, One Piece..."
                  className="flex-1 text-white placeholder-white/40 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 pointer-events-auto select-text"
                />
                <button 
                  onClick={() => handleSearch(searchQuery)}
                  disabled={isSearching}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  <span>Buscar</span>
                </button>
              </div>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 grid gap-2 max-h-[200px] overflow-y-auto scrollbar-custom pr-2">
                  {searchResults.map((res, i) => (
                    <div 
                      key={i} 
                      onClick={() => applyResult(res)}
                      className="flex gap-3 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors border border-white/5"
                    >
                      {res.cover && <img src={res.cover} alt="cover" className="w-12 h-16 object-cover rounded" />}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="font-semibold text-sm truncate">{res.title}</div>
                        <div className="text-xs text-white/60 line-clamp-2 mt-1">{res.synopsis}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs text-white/60">Título</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="text-white placeholder-white/40 bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 pointer-events-auto select-text"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/60">Tipo de Mídia</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as CultureType }))}
                className="text-white bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500/50 appearance-none pointer-events-auto"
              >
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs text-white/60">Progresso (Atual / Total)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  value={formData.progress}
                  onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                  className="w-20 text-white bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500/50"
                />
                <span className="text-dark-subtext">/</span>
                <input
                  type="number"
                  min="0"
                  value={formData.total_progress}
                  onChange={e => setFormData({ ...formData, total_progress: parseInt(e.target.value) || 0 })}
                  className="w-20 text-white bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500/50"
                  placeholder="∞"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs text-dark-subtext">URL da Capa (Imagem)</label>
              <input
                type="text"
                value={formData.cover_image}
                onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                className="text-white bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500/50 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs text-dark-subtext">Link de Acesso (Onde assistir/ler)</label>
              <input
                type="text"
                value={formData.access_link}
                onChange={e => setFormData({ ...formData, access_link: e.target.value })}
                className="text-white bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500/50 text-sm"
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs text-dark-subtext">Sinopse / Anotações</label>
              <textarea
                value={formData.synopsis}
                onChange={e => setFormData({ ...formData, synopsis: e.target.value })}
                rows={4}
                className="text-white bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500/50 text-sm resize-none"
              />
            </div>
            
            <div className="flex items-center gap-3 sm:col-span-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.is_goal ? 'bg-brand-500 border-brand-500' : 'border-white/20 group-hover:border-white/40'}`}>
                  {formData.is_goal ? <div className="w-2 h-2 bg-white rounded-sm" /> : null}
                </div>
                <span className="text-sm font-medium">Definir como Objetivo Ativo</span>
              </label>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={!!formData.is_goal} 
                onChange={e => setFormData({ ...formData, is_goal: e.target.checked ? 1 : 0 })} 
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
          {itemToEdit ? (
            <button 
              onClick={handleDelete}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} />
              <span>Excluir</span>
            </button>
          ) : <div />}
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || !formData.title}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:shadow-none"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{itemToEdit ? 'Salvar' : 'Adicionar'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
