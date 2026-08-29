import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Tag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { preprocessMarkdownCode, markdownComponents } from '../utils/markdownPreprocess';
import QuizHistorySection from './QuizHistorySection';
import { QuizOptionList } from './player/QuizOptionList';
import { QuizExplanationPanel } from './player/QuizExplanationPanel';
import type { QuestionItem } from '../types';

interface QuizPlayerCardProps {
  q: QuestionItem;
  qIndex: number;
  isEvaluating: boolean;
  onUpdateSingleQuestion: (
    qId: string,
    partial: Partial<QuestionItem>,
    immediate?: boolean
  ) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => void;
  onDiscussInChat: (q: QuestionItem, index: number) => void;
}

export const QuizPlayerCard = memo(function QuizPlayerCard({
  q,
  qIndex,
  isEvaluating,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  onDiscussInChat,
}: QuizPlayerCardProps) {
  const isOpen = q.type === 'open';

  const isWin = !isOpen
    ? q.answered && q.selectedIndex === q.correctIndex
    : q.answered && q.aiFeedback?.verdict === 'Correto';
  const isPartial = isOpen && q.answered && q.aiFeedback?.verdict === 'Parcial';
  const isLoss = q.answered && !isWin && !isPartial;

  const hasGabarito = Boolean(
    q.explanation ||
      (isOpen && q.expectedAnswer) ||
      (!isOpen && typeof q.correctIndex === 'number')
  );

  const optionsList = Array.isArray(q.options) ? q.options : [];

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'g' || e.key === 'G') && (e.altKey || e.ctrlKey)) {
          e.preventDefault();
          e.stopPropagation();
          onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation }, true);
        }
      }}
      className={`p-5 rounded-2xl border space-y-4 focus:outline-none focus:border-purple-500/50 ${
        q.answered
          ? isWin
            ? 'bg-green-950/10 border-green-500/30'
            : isPartial
              ? 'bg-amber-950/10 border-amber-500/30'
              : 'bg-red-950/10 border-red-500/30'
          : 'bg-black/40 border-purple-500/20'
      }`}
    >
      {/* Header da Questão */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
            {qIndex + 1}
          </span>
          <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
            {isOpen ? 'Questão Aberta' : 'Múltipla Escolha'}
          </span>

          {/* BOTÃO DISCRETO DE EMOJI DO GABARITO NO TOPO ESQUERDO DO CARD */}
          {hasGabarito && (
            <button
              onClick={() =>
                onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation }, true)
              }
              className={`px-1.5 py-0.5 rounded-md transition-all flex items-center justify-center border text-xs leading-none ${
                q.showExplanation
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-dark-subtext hover:text-amber-300'
              }`}
              title={
                q.showExplanation
                  ? 'Ocultar Gabarito / Explicação (Alt+G)'
                  : '💡 Consultar Gabarito de Referência (Alt+G)'
              }
            >
              <span className="text-[12px]">💡</span>
            </button>
          )}
        </div>

        {q.tags && q.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {q.tags.map((tag, tIdx) => (
              <span
                key={tIdx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-0.5"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Enunciado */}
      <div className="text-xs text-purple-100 font-medium leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {preprocessMarkdownCode(q.question || '')}
        </ReactMarkdown>
      </div>

      {/* Alternativas (Múltipla Escolha) */}
      {!isOpen && (
        <QuizOptionList
          question={q}
          optionsList={optionsList}
          onUpdateSingleQuestion={onUpdateSingleQuestion}
        />
      )}

      {/* Resposta Aberta */}
      {isOpen && (
        <div className="space-y-3">
          <textarea
            value={q.userTypedAnswer || ''}
            disabled={q.answered || isEvaluating}
            onChange={(e) =>
              onUpdateSingleQuestion(q.id, { userTypedAnswer: e.target.value })
            }
            onKeyDown={(e) => {
              e.stopPropagation();

              // Alt+G or Ctrl+G toggles answer explanation/key
              if ((e.key === 'g' || e.key === 'G') && (e.altKey || e.ctrlKey)) {
                e.preventDefault();
                onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation }, true);
                return;
              }

              // Enter submits response for evaluation (Shift+Enter inserts newline)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (
                  q.userTypedAnswer &&
                  q.userTypedAnswer.trim() &&
                  !q.answered &&
                  !isEvaluating
                ) {
                  onEvaluateOpenAnswer(q, qIndex);
                }
              }
            }}
            placeholder="Escreva sua resposta detalhada aqui... (Enter para enviar | Alt+G para Gabarito)"
            className="w-full bg-black/40 border border-purple-500/20 focus:border-purple-500/50 rounded-xl p-3 text-xs text-purple-100 placeholder-white/25 outline-none resize-y min-h-[80px] leading-relaxed transition-colors disabled:opacity-75"
            rows={3}
          />

          {!q.answered && (
            <button
              onClick={() => onEvaluateOpenAnswer(q, qIndex)}
              disabled={isEvaluating || !q.userTypedAnswer?.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
            >
              {isEvaluating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>{isEvaluating ? 'Avaliando com IA...' : 'Avaliar Resposta com IA'}</span>
            </button>
          )}

          {q.answered && q.aiFeedback && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 text-xs leading-relaxed ${
                isWin
                  ? 'bg-green-500/10 border-green-500/30 text-green-200'
                  : isPartial
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {isWin && <CheckCircle2 size={15} className="text-green-400" />}
                  {isPartial && <Sparkles size={15} className="text-amber-400" />}
                  {isLoss && <XCircle size={15} className="text-red-400" />}
                  <span>Parecer da IA: {q.aiFeedback.verdict}</span>
                </span>
                <button
                  onClick={() => onDiscussInChat(q, qIndex)}
                  className="text-[11px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                >
                  <MessageSquare size={12} />
                  <span>Discutir no Chat</span>
                </button>
              </div>
              <p className="opacity-90">{q.aiFeedback.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Ações após responder (Explicação / Refazer) */}
      {q.answered && (
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation }, true)
              }
              className="text-xs text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/5 transition-colors"
            >
              <span>{q.showExplanation ? 'Ocultar Gabarito' : '💡 Ver Gabarito / Explicação'}</span>
              {q.showExplanation ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            <button
              onClick={() => {
                onUpdateSingleQuestion(
                  q.id,
                  {
                    answered: false,
                    selectedIndex: null,
                    userTypedAnswer: '',
                    aiFeedback: null,
                    showExplanation: false,
                  },
                  true
                );
              }}
              className="text-xs text-dark-subtext hover:text-white flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Tentar Novamente</span>
            </button>
          </div>
        </div>
      )}

      {/* Painel do Gabarito e Explicação Expandido */}
      {q.showExplanation && (
        <QuizExplanationPanel
          question={q}
          isOpen={isOpen}
          optionsList={optionsList}
        />
      )}

      {/* Histórico - só aparece quando a questão já foi respondida */}
      {q.answered && <QuizHistorySection question={q} />}
    </div>
  );
});
