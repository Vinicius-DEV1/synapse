import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, RefreshCcw, FileText, Layers, Folder, DollarSign, Lock, PlayCircle, Loader2, AlertTriangle, AlertCircle, Music } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { hardDeleteLofiPermanently } from '../../services/lofi-manager';

interface TrashItem {
  id: string;
  title: string;
  item_type: string;
  deleted_at: string;
}

export default function TrashView() {
  const { dispatch } = useStore();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    if (window.api?.trash) {
      const res = await window.api.trash.getAll();
      setItems(res || []);
    }
    setLoading(false);
  };

  const handleRestore = async (item: TrashItem) => {
    setProcessingId(item.id);
    try {
      if (window.api?.trash) {
        await window.api.trash.restore(item.id, item.item_type);
        setItems(prev => prev.filter(i => i.id !== item.id));
        if (item.item_type === 'page') {
          dispatch({ type: 'LOAD_PAGES_REQUEST' });
        }
        if (item.item_type === 'lofi') {
          window.dispatchEvent(new Event('app-sync-trigger'));
        }
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao restaurar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleHardDelete = async (item: TrashItem) => {
    if (!confirm(`Excluir permanentemente "${item.title}"? Esta ação não pode ser desfeita.`)) return;
    
    setProcessingId(item.id);
    try {
      if (item.item_type === 'lofi' && window.api?.sync) {
        try {
          const rows = await window.api.sync.getAllRows('lofi_items');
          const lofi = rows?.find((r: any) => r.id === item.id);
          if (lofi) {
            await hardDeleteLofiPermanently(lofi);
            setItems(prev => prev.filter(i => i.id !== item.id));
            window.dispatchEvent(new Event('app-sync-trigger'));
            return;
          }
        } catch (err) {
          console.warn("Erro ao excluir permanentemente lofi:", err);
        }
      }

      if (window.api?.trash?.deletePermanently) {
        await window.api.trash.deletePermanently(item.id, item.item_type);
        setItems(prev => prev.filter(i => i.id !== item.id));
      } else {
        alert("Função ainda não implementada no backend");
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao excluir.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      if (window.api?.sync) {
        try {
          const rows = await window.api.sync.getAllRows('lofi_items');
          const trashed = rows?.filter((r: any) => r.deleted_at);
          if (trashed) {
            for (const lofi of trashed) {
              await hardDeleteLofiPermanently(lofi).catch(() => {});
            }
          }
        } catch (err) {}
      }

      if (window.api?.trash?.empty) {
        await window.api.trash.empty();
        setItems([]);
        setShowEmptyConfirm(false);
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao esvaziar lixeira.");
    } finally {
      setIsEmptying(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'page': return <FileText className="text-blue-400" />;
      case 'anki_deck': return <Layers className="text-indigo-400" />;
      case 'anki_card': return <Layers className="text-purple-400" />;
      case 'file': return <Folder className="text-yellow-400" />;
      case 'finance': return <DollarSign className="text-emerald-400" />;
      case 'vault': return <Lock className="text-orange-400" />;
      case 'video': return <PlayCircle className="text-rose-400" />;
      case 'lofi': return <Music className="text-purple-400" />;
      default: return <FileText className="text-dark-subtext" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'page': return 'Nota';
      case 'anki_deck': return 'Baralho';
      case 'anki_card': return 'Flashcard';
      case 'file': return 'Arquivo';
      case 'finance': return 'Transação';
      case 'vault': return 'Cofre';
      case 'video': return 'Vídeo';
      case 'lofi': return 'Lofi';
      default: return 'Desconhecido';
    }
  };

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(i => {
      if (filter === 'notes') return i.item_type === 'page';
      if (filter === 'flashcards') return i.item_type === 'anki_deck' || i.item_type === 'anki_card';
      if (filter === 'files') return i.item_type === 'file';
      if (filter === 'finance') return i.item_type === 'finance';
      if (filter === 'vault') return i.item_type === 'vault';
      if (filter === 'lofi') return i.item_type === 'lofi';
      return true;
    });
  }, [items, filter]);

  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-dark-text p-8 overflow-y-auto relative" style={{ height: '100dvh' }}>
      <div className="max-w-6xl mx-auto w-full space-y-8 flex flex-col h-full">
        
        <header className="flex justify-between items-center pb-6 border-b border-white/5 shrink-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trash2 className="w-8 h-8 text-red-500" />
              Lixeira Universal
            </h1>
            <p className="text-dark-subtext mt-2">
              Gerencie arquivos apagados de todos os módulos. Itens na lixeira podem ser restaurados ou excluídos permanentemente.
            </p>
          </div>
          <button 
            onClick={() => setShowEmptyConfirm(true)}
            disabled={items.length === 0}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <AlertTriangle size={18} />
            Esvaziar Lixeira
          </button>
        </header>

        {showEmptyConfirm && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-fade-in shrink-0">
            <AlertCircle size={24} className="text-red-400 shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400 mb-2">Esvaziar Lixeira Definitivamente?</h3>
              <p className="text-red-300/80 text-sm mb-4">
                Todos os {items.length} itens serão permanentemente apagados do banco de dados local e da nuvem. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEmptyConfirm(false)}
                  disabled={isEmptying}
                  className="px-4 py-2 bg-dark-card border border-white/10 hover:bg-white/5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleEmptyTrash}
                  disabled={isEmptying}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  {isEmptying && <Loader2 size={16} className="animate-spin" />}
                  Confirmar Exclusão Permanente
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
          {[
            { id: 'all', label: 'Todos os Itens' },
            { id: 'notes', label: 'Notas' },
            { id: 'flashcards', label: 'Flashcards' },
            { id: 'files', label: 'Arquivos' },
            { id: 'finance', label: 'Financeiro' },
            { id: 'vault', label: 'Cofre' },
            { id: 'lofi', label: 'Lofi' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.id ? 'bg-white/10 text-white' : 'text-dark-subtext hover:bg-white/5 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-dark-card border border-white/5 rounded-2xl shadow-xl">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-dark-subtext">
              <Loader2 size={32} className="animate-spin mb-4 text-brand-500" />
              <p>Carregando itens apagados...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-dark-subtext">
              <Trash2 size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Lixeira Vazia</p>
              <p className="text-sm mt-1">Nenhum item apagado encontrado aqui.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-dark-card/95 backdrop-blur-md z-10 border-b border-white/10">
                  <tr>
                    <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider">Item</th>
                    <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider w-32">Tipo</th>
                    <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider w-48">Data de Exclusão</th>
                    <th className="py-4 px-6 text-xs font-semibold text-dark-subtext uppercase tracking-wider w-40 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            {getIcon(item.item_type)}
                          </div>
                          <span className="font-medium text-white/90 truncate max-w-[300px] md:max-w-md" title={item.title}>
                            {item.title || 'Sem título'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-white/5 rounded-md text-xs text-dark-subtext font-medium">
                          {getTypeLabel(item.item_type)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-dark-subtext">
                        {new Date(item.deleted_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={processingId === item.id || isEmptying}
                            className="p-2 hover:bg-white/10 text-dark-subtext hover:text-white rounded-lg transition-colors"
                            title="Restaurar"
                          >
                            {processingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                          </button>
                          <button
                            onClick={() => handleHardDelete(item)}
                            disabled={processingId === item.id || isEmptying}
                            className="p-2 hover:bg-red-500/10 text-dark-subtext hover:text-red-400 rounded-lg transition-colors"
                            title="Excluir Definitivamente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
