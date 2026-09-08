import { memo, useRef, useEffect, useMemo } from 'react';
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
import { FastMarkdown } from '../utils/markdownPreprocess';
import QuizHistorySection from './QuizHistorySection';
import { QuizOptionList } from './player/QuizOptionList';
import { QuizExplanationPanel } from './player/QuizExplanationPanel';
import { getSettings } from '../../../../utils/settings';
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const modelName = useMemo(() => {
    if (q.aiFeedback?.model) {
      return q.aiFeedback.model.replace(/^models\//, '');
    }
    try {
      const s = getSettings();
      return (s.geminiModel || 'gemini').replace(/^models\//, '');
    } catch {
      return 'gemini';
    }
  }, [q.aiFeedback]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el && isOpen) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 68), 260)}px`;
    }
  }, [q.userTypedAnswer, isOpen]);

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
        const activeEl = document.activeElement;
        const isInput =
          activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

        const isGKey = e.key.toLowerCase() === 'g';
        const hasOptionG = Boolean(!isOpen && optionsList.length > 6);

        if ((isGKey && (e.altKey || e.ctrlKey)) || (isGKey && !isInput && !hasOptionG)) {
          e.preventDefault();
          e.stopPropagation();
          onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation }, true);
        }
      }}
      className={`p-4 md:p-5 rounded-2xl border space-y-4 focus:outline-none transition-all ${
        q.answered
          ? isWin
            ? 'bg-emerald-500/[0.04] border-emerald-500/20'
            : isPartial
              ? 'bg-amber-500/[0.04] border-amber-500/20'
              : 'bg-rose-500/[0.04] border-rose-500/20'
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
      }`}
    >
      {/* Header da Questão */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/80 text-xs font-medium font-mono">
            {qIndex + 1}
          </span>
          <span className="text-[11px] font-medium text-dark-subtext uppercase tracking-wider">
            {isOpen ? 'Questão Aberta' : 'Múltipla Escolha'}
          </span>

          {/* BOTÃO DE GABARITO NO TOPO ESQUERDO DO CARD */}
          {hasGabarito && (
            <button
              onClick={() =>
                onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation }, true)
              }
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 border text-[11px] font-medium ${
                q.showExplanation
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-dark-subtext hover:text-white'
              }`}
              title={
                q.showExplanation
                  ? 'Ocultar Gabarito / Explicação (Alt+G)'
                  : '💡 Consultar Gabarito de Referência (Alt+G)'
              }
            >
              <span className="text-[11px]">💡</span>
              <span className="hidden sm:inline">Gabarito</span>
            </button>
          )}
        </div>

        {q.tags && q.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {q.tags.map((tag, tIdx) => (
              <span
                key={tIdx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-dark-subtext border border-white/[0.06] flex items-center gap-1"
              >
                <Tag size={9} className="opacity-60" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Enunciado */}
      <div className="text-xs md:text-sm text-white/95 font-medium leading-relaxed">
        <FastMarkdown content={q.question || ''} className="inline leading-relaxed" />
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
            ref={textareaRef}
            value={q.userTypedAnswer || ''}
            disabled={q.answered || isEvaluating}
            onChange={(e) => {
              onUpdateSingleQuestion(q.id, { userTypedAnswer: e.target.value });
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 68), 260)}px`;
            }}
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
            placeholder="Escreva sua resposta detalhada aqui... (Enter para enviar | Shift+Enter para nova linha | Alt+G para Gabarito)"
            className="w-full bg-black/20 border border-white/[0.08] focus:border-brand-500/50 rounded-xl p-3 text-xs md:text-sm text-white placeholder-white/20 outline-none resize-none min-h-[68px] max-h-[260px] overflow-y-auto leading-relaxed transition-[border-color] disabled:opacity-75 break-words"
            rows={2}
          />

          {!q.answered && (
            <button
              onClick={() => onEvaluateOpenAnswer(q, qIndex)}
              disabled={isEvaluating || !q.userTypedAnswer?.trim()}
              className="px-4 py-2 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 disabled:opacity-40 text-brand-200 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center gap-2 shadow-xs"
            >
              {isEvaluating ? (
                <Loader2 size={14} className="animate-spin text-brand-300" />
              ) : (
                <Sparkles size={14} className="text-brand-300" />
              )}
              <span>{isEvaluating ? 'Avaliando com IA...' : 'Avaliar Resposta com IA'}</span>
            </button>
          )}

          {q.answered && q.aiFeedback && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 text-xs leading-relaxed ${
                isWin
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : isPartial
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-1.5">
                  {isWin && <CheckCircle2 size={15} className="text-emerald-400" />}
                  {isPartial && <Sparkles size={15} className="text-amber-400" />}
                  {isLoss && <XCircle size={15} className="text-rose-400" />}
                  <span>Parecer da IA: {q.aiFeedback.verdict}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] text-zinc-400 font-normal flex items-center gap-1 select-none"
                    title={`Modelo IA: ${modelName}`}
                  >
                    <span>Gemini AI</span>
                    {modelName && (
                      <>
                        <span className="opacity-30">•</span>
                        <span className="font-mono text-[9px] text-zinc-400/80 bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06]">
                          {modelName}
                        </span>
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => onDiscussInChat(q, qIndex)}
                    className="text-[11px] font-medium text-dark-subtext hover:text-white flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <MessageSquare size={12} />
                    <span>Discutir no Chat</span>
                  </button>
                </div>
              </div>
              <p className="opacity-90">{q.aiFeedback.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Ações após responder (Explicação / Refazer) */}
      {q.answered && (
        <div className="pt-2 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation }, true)
              }
              className="text-xs text-white/80 hover:text-white font-medium flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/5 transition-colors"
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
