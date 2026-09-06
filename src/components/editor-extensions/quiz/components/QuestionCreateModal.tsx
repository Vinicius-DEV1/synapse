import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, List, Layers, HelpCircle } from 'lucide-react';
import { Portal } from '../../../ui/Portal';

interface QuestionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string, reuseExisting: boolean) => void;
}

interface ExistingWidget {
  title: string;
  pageId: string;
  pageTitle: string;
}

export default function QuestionCreateModal({ isOpen, onClose, onConfirm }: QuestionCreateModalProps) {
  const [title, setTitle] = useState('');
  const [existingWidgets, setExistingWidgets] = useState<ExistingWidget[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      searchExistingWidgets('');
    }
  }, [isOpen]);

  const searchExistingWidgets = async (query: string) => {
    setIsSearching(true);
    try {
      const allPages = await window.api.getAllPages();
      const results: ExistingWidget[] = [];
      const lowerQuery = query.toLowerCase();
      
      // Regex para extrair data-title dos blocos de questão
      const titleRegex = /<div[^>]*class="[^"]*question-block[^"]*"[^>]*data-title="([^"]+)"/gi;

      for (const page of allPages) {
        if (!page.id) continue;
        const pageData = await window.api.getPageContent(page.id).catch(() => null);
        if (!pageData?.content) continue;
        
        let match;
        while ((match = titleRegex.exec(pageData.content)) !== null) {
          const widgetTitle = match[1];
          if (widgetTitle.toLowerCase().includes(lowerQuery)) {
            // Evita duplicatas exatas na lista
            if (!results.find(r => r.title === widgetTitle)) {
              results.push({
                title: widgetTitle,
                pageId: page.id,
                pageTitle: page.title || 'Página sem título'
              });
            }
          }
        }
      }
      setExistingWidgets(results.slice(0, 8)); // Limita a 8 resultados
    } catch (err) {
      console.error('[QuestionCreateModal] Erro ao buscar widgets:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      searchExistingWidgets(title);
    }, 400);
    return () => clearTimeout(timeout);
  }, [title, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm(title.trim(), false);
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all"
        onMouseDown={onClose}
      >
        <div 
          className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in flex flex-col"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
            <div className="flex items-center gap-2 text-brand-400">
              <HelpCircle size={18} />
              <h3 className="font-medium text-sm text-white">Criar Widget de Questões</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-white/40 hover:text-white hover:bg-white/10 p-1 rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nome da bateria (ex: Revisão de História)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!title.trim()}
                className="absolute right-2 top-2 bottom-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg px-3 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>
            </form>

            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center justify-between">
                <span>{isSearching ? 'Buscando...' : 'Widgets Existentes no App'}</span>
              </h4>
              
              <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar -mx-2 px-2">
                {existingWidgets.length === 0 && !isSearching ? (
                  <div className="text-center py-6 text-white/30 text-xs bg-black/20 rounded-xl border border-white/5 border-dashed">
                    Nenhum widget similar encontrado.
                  </div>
                ) : (
                  existingWidgets.map((widget, i) => (
                    <button
                      key={i}
                      onClick={() => onConfirm(widget.title, true)}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20 group-hover:border-brand-500/40 transition-colors">
                        <Layers size={14} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white text-sm font-medium truncate group-hover:text-brand-300 transition-colors">
                          {widget.title}
                        </span>
                        <span className="text-white/40 text-xs truncate flex items-center gap-1">
                          <List size={10} /> Em "{widget.pageTitle}"
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
