import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessMarkdownCode, markdownComponents } from '../../utils/markdownPreprocess';
import type { QuestionItem } from '../../types';

interface QuizExplanationPanelProps {
  question: QuestionItem;
  isOpen: boolean;
  optionsList: string[];
}

export function QuizExplanationPanel({
  question: q,
  isOpen,
  optionsList,
}: QuizExplanationPanelProps) {
  return (
    <div className="p-3.5 md:p-4 bg-white/[0.02] border border-white/[0.08] rounded-xl text-xs text-white/90 leading-relaxed space-y-3">
      {/* Expected Answer for Open-Ended Question */}
      {isOpen && q.expectedAnswer && (
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-amber-300/90 flex items-center gap-1.5 uppercase tracking-wider">
            📌 Resposta Esperada / Gabarito:
          </span>
          <div className="text-xs text-white/90 opacity-95">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {preprocessMarkdownCode(q.expectedAnswer)}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Alternativa Correta para Múltipla Escolha */}
      {!isOpen &&
        typeof q.correctIndex === 'number' &&
        optionsList[q.correctIndex] !== undefined && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-emerald-300/90 flex items-center gap-1.5 uppercase tracking-wider">
              ✓ Alternativa Correta: {String.fromCharCode(65 + q.correctIndex)}){' '}
              {optionsList[q.correctIndex] || ''}
            </span>
          </div>
        )}

      {/* Explicação Pedagógica */}
      {q.explanation && (
        <div
          className={`space-y-1 ${
            isOpen && q.expectedAnswer ? 'pt-2.5 border-t border-white/[0.06]' : ''
          }`}
        >
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider block">
            💡 Explicação do Gabarito:
          </span>
          <div className="text-xs text-white/90">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {preprocessMarkdownCode(q.explanation)}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Caso não haja gabarito nem explicação cadastrados */}
      {!q.explanation &&
        !(isOpen && q.expectedAnswer) &&
        !(!isOpen && typeof q.correctIndex === 'number') && (
          <span className="text-dark-subtext italic">
            Nenhum gabarito ou explicação cadastrado para esta questão.
          </span>
        )}
    </div>
  );
}
