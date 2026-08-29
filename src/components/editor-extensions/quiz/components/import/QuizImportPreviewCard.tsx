import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tag, FileText, ListOrdered, Trash2 } from 'lucide-react';
import { markdownComponents, preprocessMarkdownCode } from '../../utils/markdownPreprocess';
import type { QuestionItem } from '../../types';

interface QuizImportPreviewCardProps {
  question: QuestionItem;
  index: number;
  onDelete: (index: number) => void;
}

export const QuizImportPreviewCard = memo(function QuizImportPreviewCard({
  question,
  index,
  onDelete,
}: QuizImportPreviewCardProps) {
  return (
    <div className="bg-dark-card border border-purple-500/20 rounded-2xl p-4 text-xs space-y-2.5 relative group/card hover:border-purple-500/40 transition-all">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
            Questão {index + 1}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-200 border-purple-500/20 flex items-center gap-1">
            {question.type === 'open' ? <FileText size={10} /> : <ListOrdered size={10} />}
            <span>{question.type === 'open' ? 'Questão Aberta' : 'Múltipla Escolha'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {question.tags && question.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {question.tags.map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-purple-300 border border-white/10 flex items-center gap-0.5"
                >
                  <Tag size={8} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Botão de Exclusão Direta (1 Clique) */}
          <button
            onClick={() => onDelete(index)}
            className="p-1 text-dark-subtext hover:text-red-400 hover:bg-red-500/15 rounded-lg border border-transparent hover:border-red-500/30 transition-all"
            title="Remover esta questão do preview"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="font-semibold text-purple-100 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {preprocessMarkdownCode(question.question || 'Sem enunciado')}
        </ReactMarkdown>
      </div>

      {question.type === 'multiple_choice' && question.options.filter((o) => o).length > 0 && (
        <div className="space-y-1 pl-1">
          {question.options.map((opt, oIdx) => (
            <div
              key={oIdx}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-2 ${
                oIdx === question.correctIndex
                  ? 'bg-green-500/15 border border-green-500/30 text-green-300 font-semibold'
                  : 'text-purple-200/80'
              }`}
            >
              <span className="font-mono font-bold text-[10px]">
                {String.fromCharCode(65 + oIdx)})
              </span>
              <span>{opt || '—'}</span>
              {oIdx === question.correctIndex && (
                <span className="text-[10px] font-bold text-green-400 ml-auto">✓ Correta</span>
              )}
            </div>
          ))}
        </div>
      )}

      {question.type === 'open' && question.expectedAnswer && (
        <p className="text-[11px] text-purple-200 bg-purple-950/30 p-2 rounded-lg border border-purple-500/20">
          <strong className="text-purple-300">📌 Gabarito:</strong> {question.expectedAnswer}
        </p>
      )}

      {question.explanation && (
        <p className="text-[11px] text-purple-200/80 bg-black/20 p-2 rounded-lg border border-white/5">
          <strong className="text-purple-300">💡 Explicação:</strong> {question.explanation}
        </p>
      )}
    </div>
  );
});
