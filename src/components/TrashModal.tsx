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
      if (window.api?.notes) {
        const pages = await window.api.notes.getDeletedPages();
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
      if (window.api?.notes) {
        await window.api.notes.restorePage(id);
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-bg border border-dark-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-2 text-dark-text">
            <Trash2 size={20} className="text-red-400" />
            <h2 className="font-semibold font-serif">Lixeira</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded text-dark-subtext hover:text-dark-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-dark-subtext">
              <Loader2 size={24} className="animate-spin mb-2" />
              <p className="text-sm">Carregando...</p>
            </div>
          ) : deletedPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Trash2 size={24} className="text-dark-subtext opacity-50" />
              </div>
              <p className="text-dark-text font-medium">A lixeira está vazia</p>
              <p className="text-dark-subtext text-sm mt-1">Nenhuma página foi excluída recentemente.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {deletedPages.map(page => (
                <div key={page.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-hover border border-dark-border group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                      {page.icon ? (
                        <span className="text-lg">{page.icon}</span>
                      ) : (
                        <FileText size={16} className="text-dark-subtext" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-dark-text truncate">
                        {page.title || 'Sem título'}
                      </p>
                      <p className="text-xs text-dark-subtext mt-0.5">
                        Deletada em {page.deleted_at ? new Date(page.deleted_at).toLocaleDateString('pt-BR') : 'Data desconhecida'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(page.id)}
                    disabled={restoringId === page.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors text-xs font-medium shrink-0 disabled:opacity-50"
                  >
                    {restoringId === page.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={14} />
                    )}
                    Restaurar
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
