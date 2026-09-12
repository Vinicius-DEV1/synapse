import { useMemo, useState } from 'react';
import HtmlDiff from 'htmldiff-js';
import DOMPurify from 'dompurify';
import { Check, X, FileDiff, Columns2, AlignLeft } from 'lucide-react';

interface DocumentDiffViewerProps {
  originalText: string;
  proposedText: string;
  onApply: (text: string) => void;
  onDiscard: () => void;
}

function countWords(str: string): number {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

export function DocumentDiffViewer({
  originalText,
  proposedText,
  onApply,
  onDiscard,
}: DocumentDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'diff' | 'rawProposed'>('diff');

  const origWords = useMemo(() => countWords(originalText), [originalText]);
  const newWords = useMemo(() => countWords(proposedText), [proposedText]);
  const wordsDiff = newWords - origWords;

  const diffHtml = useMemo(() => {
    try {
      // Escape HTML entities to prevent unescaped markdown from rendering arbitrary tags
      const safeOld = originalText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeNew = proposedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return HtmlDiff.execute(safeOld, safeNew);
    } catch (e) {
      console.warn('[DocumentDiffViewer] HtmlDiff failed, falling back to raw view:', e);
      return safeNewHtmlFallback(originalText, proposedText);
    }
  }, [originalText, proposedText]);

  function safeNewHtmlFallback(_oldText: string, newText: string): string {
    const escaped = newText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div class="p-4 text-dark-subtext">Não foi possível calcular o diff linha a linha. Exibindo nova versão proposta.</div><pre class="p-4 text-white">${escaped}</pre>`;
  }

  return (
    <div className="flex flex-col h-full bg-dark-bg/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-dark-card/60 backdrop-blur-md">
        <div className="flex items-center gap-2 text-brand-400 text-sm font-semibold">
          <FileDiff size={18} />
          <span>Revisão de Alterações Propostas pela IA</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Words Stats */}
          <div className="flex items-center gap-2 text-xs font-mono text-dark-subtext">
            <span>Original: {origWords} pal.</span>
            <span>→</span>
            <span className="text-white font-medium">Novo: {newWords} pal.</span>
            <span
              className={`px-2 py-0.5 rounded-md font-bold ${
                wordsDiff > 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : wordsDiff < 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-white/10 text-dark-subtext'
              }`}
            >
              {wordsDiff > 0 ? `+${wordsDiff}` : wordsDiff}
            </span>
          </div>

          {/* Toggle view: Diff vs Raw Proposed */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'diff' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
              }`}
              title="Exibir marcas de inserção e deleção"
            >
              <Columns2 size={13} />
              <span>Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('rawProposed')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'rawProposed' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
              }`}
              title="Exibir texto completo proposto"
            >
              <AlignLeft size={13} />
              <span>Texto Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Diff Content */}
      <div className="flex-1 overflow-y-auto p-6 diff-viewer-container font-mono text-sm leading-relaxed select-text">
        {viewMode === 'diff' ? (
          <div
            className="whitespace-pre-wrap word-break text-gray-200"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(diffHtml) }}
          />
        ) : (
          <pre className="whitespace-pre-wrap word-break text-gray-100 font-mono text-xs">
            {proposedText}
          </pre>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-dark-card/60 backdrop-blur-md">
        <div className="text-xs text-dark-subtext flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-emerald-500/40 border border-emerald-500 rounded" />
          <span>Texto adicionado</span>
          <span className="inline-block w-2.5 h-2.5 bg-red-500/40 border border-red-500 rounded ml-2" />
          <span>Texto removido</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 text-dark-subtext hover:text-white hover:bg-white/10 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <X size={14} />
            <span>Descartar</span>
          </button>

          <button
            type="button"
            onClick={() => onApply(proposedText)}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Aplicar Alterações no Arquivo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
