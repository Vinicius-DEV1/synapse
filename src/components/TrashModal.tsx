import { useState, useEffect } from 'react';
import { X, Trash2, RefreshCcw, FileText, Loader2 } from 'lucide-react';
import type { PageMeta } from '../types';

interface TrashModalProps {
  onClose: () => void;
  onPageRestored: () => void;
}

export default function TrashModal({ onClose, onPageRestored }: TrashModalProps) {
  const [deletedPages, setDeletedPages] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedPages();
  }, []);

  const loadDeletedPages = async () => {
    try {
      setLoading(true);
      if (window.api) {
        const pages = await window.api.getDeletedPages();
        setDeletedPages(pages || []);
      }
    } catch (e) {
      console.error('Failed to load deleted pages', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setRestoringId(id);
      if (window.api) {
        await window.api.restorePage(id);
        await loadDeletedPages();
        onPageRestored();
      }
    } catch (e) {
      console.error('Failed to restore page', e);
      alert('Erro ao restaurar página.');
    } finally {
      setRestoringId(null);
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
              <h2 className="text-base font-medium text-white/90 tracking-wide">Lixeira</h2>
              <p className="text-xs text-white/40 mt-0.5">Restaure páginas excluídas</p>
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
              <p className="text-sm font-medium">Buscando páginas...</p>
            </div>
          ) : deletedPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                <Trash2 size={28} className="text-white/20" />
              </div>
              <p className="text-white/80 font-medium text-base">Sua lixeira está vazia</p>
              <p className="text-white/40 text-sm mt-1 max-w-[250px]">
                As páginas que você excluir aparecerão aqui para serem restauradas.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-2">
              {deletedPages.map(page => {
                // Se o ícone for a string literal "file", trata como sem ícone
                const renderIcon = !page.icon || page.icon === 'file' ? (
                  <FileText size={16} className="text-white/40" />
                ) : (
                  <span className="text-lg drop-shadow-sm">{page.icon}</span>
                );

                return (
                  <div 
                    key={page.id} 
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center shrink-0 border border-white/5 shadow-inner group-hover:scale-105 transition-transform duration-300">
                        {renderIcon}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white/90 truncate transition-colors duration-200 group-hover:text-white">
                          {page.title || 'Sem título'}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5 truncate">
                          Excluída em {page.deleted_at ? new Date(page.deleted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data desconhecida'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(page.id)}
                      disabled={restoringId === page.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-white transition-all duration-300 text-xs font-medium shrink-0 disabled:opacity-50 border border-brand-500/20 hover:border-brand-500 shadow-sm hover:shadow-[0_0_15px_rgba(var(--brand-500),0.4)] ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      {restoringId === page.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCcw size={14} />
                      )}
                      Restaurar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
