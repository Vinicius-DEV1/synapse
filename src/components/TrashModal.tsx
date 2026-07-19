import { useState, useEffect } from 'react';
import { X, Trash2, RefreshCcw, FileText, Loader2, Layers, Type, Folder, DollarSign, Lock, PlayCircle } from 'lucide-react';

interface TrashItem {
  id: string;
  title: string;
  item_type: string;
  deleted_at: string;
}

interface TrashModalProps {
  onClose: () => void;
  onPageRestored: () => void;
}

export default function TrashModal({ onClose, onPageRestored }: TrashModalProps) {
  const [deletedItems, setDeletedItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedItems();
  }, []);

  const loadDeletedItems = async () => {
    try {
      setLoading(true);
      if (window.api && window.api.trash) {
        const items = await window.api.trash.getAll();
        setDeletedItems(items || []);
      } else if (window.api) {
        // Fallback backward compatible
        const pages = await window.api.getDeletedPages();
        if (pages) {
          setDeletedItems(pages.map((p: any) => ({
            id: p.id,
            title: p.title,
            item_type: 'page',
            deleted_at: p.deleted_at
          })));
        }
      }
    } catch (e) {
      console.error('Failed to load deleted items', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      setRestoringId(item.id);
      if (window.api && window.api.trash) {
        await window.api.trash.restore(item.id, item.item_type);
      } else if (window.api && item.item_type === 'page') {
        await window.api.restorePage(item.id);
      }
      await loadDeletedItems();
      
      if (item.item_type === 'page') {
        onPageRestored();
      }
    } catch (e) {
      console.error('Failed to restore item', e);
      alert('Erro ao restaurar item.');
    } finally {
      setRestoringId(null);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'page': return <FileText size={16} className="text-blue-400" />;
      case 'anki_deck': return <Layers size={16} className="text-purple-400" />;
      case 'anki_card': return <Type size={16} className="text-pink-400" />;
      case 'file': return <Folder size={16} className="text-yellow-400" />;
      case 'vault': return <Lock size={16} className="text-emerald-400" />;
      case 'finance': return <DollarSign size={16} className="text-green-400" />;
      case 'culture': return <PlayCircle size={16} className="text-red-400" />;
      default: return <FileText size={16} className="text-white/40" />;
    }
  };

  const getLabelForType = (type: string) => {
    switch (type) {
      case 'page': return 'Página';
      case 'anki_deck': return 'Baralho';
      case 'anki_card': return 'Cartão';
      case 'file': return 'Arquivo';
      case 'vault': return 'Cofre';
      case 'finance': return 'Finanças';
      case 'culture': return 'Cultura';
      default: return 'Item';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
      <div className="bg-[#1C1C1F]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden flex flex-col transform transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-inner">
              <Trash2 size={16} className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white/90 tracking-wide">Lixeira Universal</h2>
              <p className="text-xs text-white/40 mt-0.5">Restaure itens excluídos de todos os módulos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/90 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-2 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <Loader2 size={24} className="animate-spin mb-3 text-brand-400" />
              <p className="text-sm font-medium">Buscando itens...</p>
            </div>
          ) : deletedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                <Trash2 size={28} className="text-white/20" />
              </div>
              <p className="text-white/80 font-medium text-base">Sua lixeira está vazia</p>
              <p className="text-white/40 text-sm mt-1 max-w-[250px]">
                Os itens que você excluir de qualquer parte do app aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-2">
              {deletedItems.map(item => (
                <div 
                  key={item.id}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.03] flex items-center justify-center border border-white/5 shadow-sm group-hover:scale-105 transition-transform">
                      {getIconForType(item.item_type)}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-white/80 truncate pr-4">{item.title || 'Sem título'}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                          {getLabelForType(item.item_type)}
                        </span>
                        <span className="text-[11px] text-white/30 truncate">
                          {new Date(item.deleted_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={restoringId === item.id}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 hover:text-brand-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-brand-500/20 opacity-0 group-hover:opacity-100"
                    title="Restaurar item"
                  >
                    {restoringId === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={14} />
                    )}
                    <span className="text-xs font-medium">Restaurar</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
