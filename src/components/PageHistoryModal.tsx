import { useEffect, useState } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import type { PageHistoryEntry } from '../types';
// @ts-ignore
import HtmlDiff from 'htmldiff-js';

interface PageHistoryModalProps {
  pageId: string;
  onClose: () => void;
}

export default function PageHistoryModal({ pageId, onClose }: PageHistoryModalProps) {
  const [history, setHistory] = useState<PageHistoryEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.getPageHistory(pageId)
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load history', err);
        setLoading(false);
      });
  }, [pageId]);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  };

  const currentEntry = history[selectedIndex];
  const previousEntry = history[selectedIndex + 1]; // Older entry since sorted DESC

  let diffHtml = '';
  if (currentEntry) {
    const oldHtml = previousEntry ? previousEntry.content : '';
    const newHtml = currentEntry.content;
    diffHtml = HtmlDiff.execute(oldHtml, newHtml);
  }

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-6">
      <div className="bg-dark-surface w-full max-w-6xl h-full max-h-[85vh] rounded-xl shadow-2xl border border-dark-border flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-surface z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-text">Histórico de Edições</h2>
              <p className="text-sm text-dark-subtext">Revise alterações feitas nesta página ao longo do tempo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-bg rounded-lg text-dark-subtext hover:text-dark-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - History List */}
          <div className="w-80 border-r border-dark-border bg-dark-bg/30 flex flex-col overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-dark-subtext">Carregando...</div>
            ) : history.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-dark-subtext h-full opacity-60">
                <AlertCircle size={32} className="mb-2" />
                <p>Nenhum histórico encontrado.</p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {history.map((entry, index) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`text-left p-4 rounded-lg transition-all border ${
                      selectedIndex === index
                        ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                        : 'bg-dark-surface border-transparent hover:border-dark-border text-dark-text hover:bg-dark-bg'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {index === 0 ? 'Versão Atual' : `Revisão ${history.length - index}`}
                    </div>
                    <div className={`text-xs ${selectedIndex === index ? 'text-brand-500/70' : 'text-dark-subtext'}`}>
                      {formatDate(entry.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Area - Diff Viewer */}
          <div className="flex-1 bg-dark-bg overflow-y-auto relative diff-viewer-container">
            {currentEntry ? (
              <div className="p-8 max-w-4xl mx-auto">
                <div 
                  className="prose prose-invert max-w-none text-dark-text"
                  dangerouslySetInnerHTML={{ __html: diffHtml }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-dark-subtext">
                {loading ? 'Buscando histórico...' : 'Selecione uma revisão à esquerda'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
