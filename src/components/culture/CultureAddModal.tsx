import { useState, useEffect } from 'react';
import { X, Search, Loader2, Save, Trash2 } from 'lucide-react';
import type { CultureItem, CultureType } from '../../types';
import { CultureService } from '../../services/culture';
import type { CultureSearchResult } from '../../services/culture/culture-apis';
import { Portal } from '../ui/Portal';
import { useCultureMediaSearch } from './hooks/useCultureMediaSearch';
import { CultureApiSearchPanel } from './ui/CultureApiSearchPanel';
import { triggerToast } from '../ui/ToastContext';

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
    is_goal: false,
    goal_note: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleSearch,
    clearResults,
  } = useCultureMediaSearch(formData.type || 'filme', itemToEdit?.title || '', !!itemToEdit);

  useEffect(() => {
    if (itemToEdit) {
      setFormData({ ...itemToEdit });
    }
  }, [itemToEdit]);

  if (!isOpen) return null;

  const applyResult = (result: CultureSearchResult) => {
    setFormData(prev => ({
      ...prev,
      title: result.title,
      synopsis: result.synopsis,
      cover_image: result.cover,
      total_progress: result.total > 0 ? result.total : prev.total_progress,
      type: result.type as CultureType,
      api_id: result.api_id,
      api_source: result.api_source as CultureItem['api_source'],
      status: result.status || 'unknown',
      volumes: result.volumes ?? null,
      chapters: result.chapters ?? null,
      episodes_count: result.episodes_count ?? null,
    }));
    clearResults();
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      triggerToast('O título da obra é obrigatório.', 'error');
      return;
    }
    if (formData.type === ('todos' as any)) {
      triggerToast("Por favor, selecione um tipo de mídia específico (Anime, Filme, etc) antes de salvar.", "error");
      return;
    }
    
    setIsSaving(true);
    try {
      if (itemToEdit) {
        await CultureService.updateItem(itemToEdit.id, formData);
        triggerToast('Obra atualizada com sucesso!', 'success');
      } else {
        await CultureService.createItem(formData);
        triggerToast('Obra adicionada com sucesso!', 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      triggerToast(err.message || 'Erro ao salvar obra.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToEdit || !window.confirm('Tem certeza que deseja excluir esta obra?')) return;
    setIsSaving(true);
    try {
      await CultureService.deleteItem(itemToEdit.id);
      triggerToast('Obra excluída.', 'info');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Erro ao excluir obra.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">
              {itemToEdit ? 'Editar Obra' : 'Adicionar Obra'}
            </h3>
            <button onClick={onClose} className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom flex flex-col gap-6">
            {!itemToEdit && (
              <CultureApiSearchPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSearching={isSearching}
                searchResults={searchResults}
                onSearch={handleSearch}
                onSelectResult={applyResult}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/70">Título *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome da mídia"
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/70">Tipo de Mídia</label>
                <select
                  value={formData.type || 'filme'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as CultureType })}
                  className="bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                >
                  {TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-dark-card text-white">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/70">Progresso Atual</label>
                <input
                  type="number"
                  min="0"
                  value={formData.progress || 0}
                  onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/70">Progresso Total</label>
                <input
                  type="number"
                  min="0"
                  value={formData.total_progress || 0}
                  onChange={e => setFormData({ ...formData, total_progress: parseInt(e.target.value) || 0 })}
                  placeholder="Ex: 24 (Eps/Caps)"
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">URL da Imagem de Capa</label>
              <input
                type="text"
                value={formData.cover_image || ''}
                onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                placeholder="https://..."
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Link de Acesso / Onde Assistir/Ler</label>
              <input
                type="text"
                value={formData.access_link || ''}
                onChange={e => setFormData({ ...formData, access_link: e.target.value })}
                placeholder="https://crunchyroll.com/..., https://netflix.com/..."
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70">Sinopse</label>
              <textarea
                rows={3}
                value={formData.synopsis || ''}
                onChange={e => setFormData({ ...formData, synopsis: e.target.value })}
                placeholder="Descrição breve..."
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50 resize-none"
              />
            </div>

            <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!formData.is_goal}
                  onChange={e => setFormData({ ...formData, is_goal: e.target.checked })}
                  className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500/20"
                />
                <span className="text-sm font-semibold text-white">Marcar como Objetivo / Meta Ativa 🎯</span>
              </label>

              {formData.is_goal ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs text-white/60">Anotação da Meta (ex: "Terminar até o fim do mês")</label>
                  <input
                    type="text"
                    value={formData.goal_note || ''}
                    onChange={e => setFormData({ ...formData, goal_note: e.target.value })}
                    placeholder="Escreva seu compromisso pessoal..."
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-dark-bg/50">
            {itemToEdit ? (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.title?.trim()}
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/20"
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
