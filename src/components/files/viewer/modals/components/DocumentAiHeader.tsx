import React from 'react';
import { Sparkles, MessageSquare, FileDiff, X } from 'lucide-react';

interface DocumentAiHeaderProps {
  documentTitle: string;
  activeTab: 'chat' | 'diff';
  proposedMarkdown: string | null;
  onSelectTab: (tab: 'chat' | 'diff') => void;
  onClose: () => void;
}

export const DocumentAiHeader: React.FC<DocumentAiHeaderProps> = ({
  documentTitle,
  activeTab,
  proposedMarkdown,
  onSelectTab,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-dark-bg/60">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
          <Sparkles size={18} />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <span>Assistente IA:</span>
            <span className="text-brand-300 font-mono text-xs">{documentTitle}</span>
          </h3>
          <p className="text-[11px] text-dark-subtext">
            Contexto ativo do documento • Digite @ para referenciar baterias de exercícios
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Tabs Switcher */}
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => onSelectTab('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'chat' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
            }`}
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('diff')}
            disabled={!proposedMarkdown}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'diff'
                ? 'bg-brand-500 text-white'
                : proposedMarkdown
                ? 'text-brand-300 hover:text-white hover:bg-white/10'
                : 'text-dark-subtext/40 cursor-not-allowed'
            }`}
          >
            <FileDiff size={14} />
            <span>Revisão (Diff)</span>
            {proposedMarkdown && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          title="Fechar assistente"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
