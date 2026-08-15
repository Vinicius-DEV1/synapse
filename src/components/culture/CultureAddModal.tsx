import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Save, Trash2 } from 'lucide-react';
import type { CultureItem, CultureType } from '../../types';
import { CultureService } from '../../services/culture';
import { searchCultureMedia } from '../../services/culture-apis';
import type { CultureSearchResult } from '../../services/culture-apis';
import { Portal } from '../ui/Portal';

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
    goal_note: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CultureSearchResult[]>([]);
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

    try {
      const type = (formData.type as string) || 'filme';
      const results = await searchCultureMedia(queryToSearch, type);
      setSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('[CultureAddModal] Erro detalhado na busca inteligente:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const applyResult = (result: CultureSearchResult) => {
    setFormData(prev => ({
      ...prev,
      title: result.title,
      synopsis: result.synopsis,
      cover_image: result.cover,
      total_progress: result.total > 0 ? result.total : prev.total_progress,
      type: result.type as CultureType,
      api_id: result.api_id,
      api_source: result.api_source,
      status: result.status || 'unknown',
      volumes: result.volumes ?? null,
      chapters: result.chapters ?? null,
      episodes_count: result.episodes_count ?? null,
    }));
    setSearchResults([]);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) return;
    if (formData.type === ('todos' as any)) {
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
    <Portal>
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
                    Buscar
                  </button>
                </div>

                {/* Search Results Preview */}
                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 max-h-48 overflow-y-auto scrollbar-custom border-t border-white/10 pt-2">
                    {searchResults.map((res, i) => (
                      <div 
                        key={i} 
                        onClick={() => applyResult(res)}
                        className="flex gap-3 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/5 items-center"
                      >
                        {res.cover && (
                          <img src={res.cover} alt={res.title} className="w-8 h-12 object-cover rounded bg-black/40" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-white">{res.title}</p>
                          <p className="text-xs text-white/50 truncate">{res.synopsis || 'Sem sinopse'}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded">
                          {res.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-dark-subtext">Título *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome da obra"
                  className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-dark-subtext">Tipo de Mídia *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as CultureType })}
                  className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500/50"
                >
                  {TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-dark-card">{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-dark-subtext">Progresso Atual</label>
                <input
                  type="number"
                  min="0"
                  value={formData.progress || 0}
                  onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                  className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-dark-subtext">Total (Episódios / Capítulos / Páginas)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.total_progress || 0}
                  onChange={e => setFormData({ ...formData, total_progress: parseInt(e.target.value) || 0 })}
                  className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dark-subtext">URL da Imagem de Capa</label>
              <input
                type="text"
                value={formData.cover_image || ''}
                onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                placeholder="https://..."
                className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dark-subtext">Sinopse</label>
              <textarea
                rows={3}
                value={formData.synopsis || ''}
                onChange={e => setFormData({ ...formData, synopsis: e.target.value })}
                placeholder="Breve descrição da história..."
                className="bg-dark-bg border border-white/10 rounded-lg p-3 text-sm text-dark-text focus:outline-none focus:border-brand-500/50 resize-none"
              />
            </div>

            {/* Metas / Focus */}
            <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Adicionar à Lista de Metas</h4>
                  <p className="text-xs text-dark-subtext">Exibe esta obra na sua lista de prioridades de consumo cultural.</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!formData.is_goal}
                  onChange={e => setFormData({ ...formData, is_goal: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 rounded border-white/10 text-brand-500 focus:ring-brand-500 bg-dark-bg cursor-pointer"
                />
              </div>

              {formData.is_goal ? (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-semibold text-dark-subtext">Anotação da Meta (opcional)</label>
                  <input
                    type="text"
                    value={formData.goal_note || ''}
                    onChange={e => setFormData({ ...formData, goal_note: e.target.value })}
                    placeholder="Ex: Assistir com amigos até o fim do mês..."
                    className="bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-xs text-dark-text focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              ) : null}
            </div>

          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
            {itemToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            ) : <div />}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-dark-subtext hover:text-white rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !formData.title?.trim()}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-colors"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar
              </button>
            </div>
          </div>

        </div>
      </div>
    </Portal>
  );
}
