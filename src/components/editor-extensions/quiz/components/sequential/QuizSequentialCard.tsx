import { memo, useRef, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Loader2,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { FastMarkdown } from '../../utils/markdownPreprocess';
import { playQuizTickSound, playQuizGabaritoSound, playQuizAiOpenSound } from '../../utils/quizSounds';
import { getSettings } from '../../../../../utils/settings';
import type { QuestionItem } from '../../types';

interface QuizSequentialCardProps {
  currentQ: QuestionItem;
  activeIndex: number;
  isEvaluating: boolean;
  isOpenType: boolean;
  onSelectOption: (optIndex: number) => void;
  onUpdateSingleQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => Promise<void> | void;
  onDiscussInChat: (q: QuestionItem, index: number) => void;
}

export const QuizSequentialCard = memo(function QuizSequentialCard({
  currentQ,
  activeIndex,
  isEvaluating,
  isOpenType,
  onSelectOption,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  onDiscussInChat,
}: QuizSequentialCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const modelName = useMemo(() => {
    if (currentQ.aiFeedback?.model) {
      return currentQ.aiFeedback.model.replace(/^models\//, '');
    }
    try {
      const s = getSettings();
      return (s.geminiModel || 'gemini').replace(/^models\//, '');
    } catch {
      return 'gemini';
    }
  }, [currentQ.aiFeedback]);

  // Auto-expand textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (el && isOpenType) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 56), 240)}px`;
    }
  }, [currentQ.userTypedAnswer, activeIndex, isOpenType]);

  const hasMeta = Boolean(
    (currentQ.tags && currentQ.tags.length > 0) ||
      currentQ.answered ||
      currentQ.explanation ||
      (isOpenType && currentQ.expectedAnswer)
  );

  return (
    <div className="p-4 sm:p-5 md:p-6 bg-white/[0.025] border border-white/[0.08] rounded-2xl space-y-4 shadow-sm relative backdrop-blur-xs">
      {/* Header do Card (Tags, Feedback Verdict & Gabarito) — apenas se houver metadados */}
      {hasMeta && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentQ.tags && currentQ.tags.length > 0 &&
              currentQ.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-zinc-400 font-mono"
                >
                  #{tag}
                </span>
              ))}
          </div>

          {/* Status / Veredicto e Gabarito */}
          <div className="flex items-center gap-2 ml-auto">
            {currentQ.answered && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  currentQ.type === 'multiple_choice'
                    ? currentQ.selectedIndex === currentQ.correctIndex
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : currentQ.aiFeedback?.verdict === 'Correto'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : currentQ.aiFeedback?.verdict === 'Parcial'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {currentQ.type === 'multiple_choice' ? (
                  currentQ.selectedIndex === currentQ.correctIndex ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Correto</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      <span>Incorreto</span>
                    </>
                  )
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>{currentQ.aiFeedback?.verdict || 'Avaliada'}</span>
                  </>
                )}
              </span>
            )}

            {/* Botão Ver Gabarito */}
            {(currentQ.explanation || (currentQ.type === 'open' && currentQ.expectedAnswer)) && (
              <button
                onClick={() => {
                  playQuizGabaritoSound();
                  onUpdateSingleQuestion(
                    currentQ.id,
                    { showExplanation: !currentQ.showExplanation },
                    true
                  );
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentQ.showExplanation
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-400 hover:text-white'
                }`}
                title="Ver/ocultar explicação e gabarito (Alt+G)"
              >
                <HelpCircle size={13} />
                <span className="hidden sm:inline">Gabarito</span>
                <kbd className="text-[10px] font-mono opacity-60">Alt+G</kbd>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Enunciado Hero com tipografia relaxada e legível */}
      <div className="text-base sm:text-lg md:text-xl font-medium text-zinc-100 leading-relaxed tracking-tight select-text">
        {currentQ.question ? (
          <FastMarkdown content={currentQ.question} className="inline leading-relaxed" />
        ) : (
          <span className="italic text-zinc-500">Questão sem enunciado cadastrado.</span>
        )}
      </div>

      {/* OPÇÕES: MÚLTIPLA ESCOLHA (Coluna Única Ergonômica - Padrão Typeform/Anki) */}
      {!isOpenType && currentQ.options && (
        <div className="flex flex-col gap-2.5 pt-1">
          {currentQ.options.map((opt, optIndex) => {
            const letter = String.fromCharCode(65 + optIndex);
            const isSelected = currentQ.selectedIndex === optIndex;
            const isCorrect = optIndex === currentQ.correctIndex;
            const optText = opt || `Opção ${letter}`;

            let style =
              'bg-white/[0.025] border-white/[0.07] hover:border-white/[0.18] text-zinc-200 hover:text-white hover:bg-white/[0.05] active:scale-[0.995]';
            let badgeStyle = 'border-white/[0.08] bg-white/[0.05] text-zinc-300 group-hover:scale-105';

            if (currentQ.answered) {
              if (isCorrect) {
                style =
                  'bg-emerald-500/10 border-emerald-500/35 text-emerald-100 font-medium scale-[1.005] shadow-[0_0_20px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/25';
                badgeStyle = 'border-emerald-500/50 bg-emerald-500/25 text-emerald-300 scale-105';
              } else if (isSelected && !isCorrect) {
                style =
                  'bg-rose-500/10 border-rose-500/35 text-rose-200 line-through opacity-80';
                badgeStyle = 'border-rose-500/50 bg-rose-500/25 text-rose-300';
              } else {
                style = 'bg-black/10 border-white/[0.03] text-zinc-500 opacity-40';
                badgeStyle = 'border-white/[0.04] bg-white/[0.02] text-zinc-600';
              }
            } else if (isSelected) {
              style = 'bg-brand-500/15 border-brand-500/35 text-white font-medium ring-1 ring-brand-500/30';
              badgeStyle = 'border-brand-500/50 bg-brand-500/30 text-brand-200';
            }

            return (
              <button
                key={optIndex}
                onClick={() => onSelectOption(optIndex)}
                onPointerEnter={() => {
                  if (!currentQ.answered) playQuizTickSound();
                }}
                disabled={currentQ.answered}
                className={`group py-3 px-3.5 sm:py-3.5 sm:px-4.5 rounded-xl border text-sm sm:text-base text-left flex items-start gap-3.5 transition-all duration-150 ease-out cursor-pointer disabled:cursor-default ${style}`}
              >
                <span
                  className={`w-7 h-7 mt-0.5 rounded-lg flex items-center justify-center font-mono font-semibold text-xs shrink-0 border transition-all duration-150 ease-out ${badgeStyle}`}
                >
                  {letter}
                </span>
                <span className="flex-1 leading-relaxed pt-0.5 text-zinc-200">
                  <FastMarkdown content={optText} className="inline leading-relaxed" />
                </span>
                {currentQ.answered && isCorrect && (
                  <Check size={16} className="text-emerald-400 shrink-0 mt-1" />
                )}
                {currentQ.answered && isSelected && !isCorrect && (
                  <X size={16} className="text-rose-400 shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* OPÇÕES: QUESTÃO ABERTA */}
      {isOpenType && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-zinc-400 flex items-center justify-between">
              <span>✍️ Sua Resposta Discursiva:</span>
              <span className="text-[11px] opacity-70">Pressione Enter para enviar (Shift+Enter para nova linha)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={currentQ.userTypedAnswer || ''}
              onChange={(e) => {
                onUpdateSingleQuestion(currentQ.id, { userTypedAnswer: e.target.value });
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 72), 260)}px`;
              }}
              onKeyDown={(e) => {
                if ((e.key === 'g' || e.key === 'G') && (e.altKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.stopPropagation();
                  playQuizGabaritoSound();
                  onUpdateSingleQuestion(
                    currentQ.id,
                    { showExplanation: !currentQ.showExplanation },
                    true
                  );
                  return;
                }

                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (currentQ.userTypedAnswer?.trim() && !currentQ.answered && !isEvaluating) {
                    onEvaluateOpenAnswer(currentQ, activeIndex);
                  }
                }
              }}
              disabled={currentQ.answered || isEvaluating}
              placeholder="Escreva sua resposta completa com clareza... (Shift+Enter para nova linha)"
              rows={2}
              className="w-full bg-black/30 border border-white/[0.09] rounded-xl p-3.5 sm:p-4 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 resize-none min-h-[72px] max-h-[260px] overflow-y-auto leading-relaxed transition-[border-color] break-words shadow-inner"
            />
          </div>

          {!currentQ.answered && (
            <button
              onClick={() => onEvaluateOpenAnswer(currentQ, activeIndex)}
              disabled={!currentQ.userTypedAnswer?.trim() || isEvaluating}
              className="w-full py-2.5 sm:py-3 px-4 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/35 disabled:opacity-40 text-brand-200 hover:text-white rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] cursor-pointer"
            >
              {isEvaluating ? (
                <>
                  <Loader2 size={16} className="animate-spin text-brand-300" />
                  <span>Avaliando com IA do Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} className="text-brand-300" />
                  <span>Enviar Resposta para Avaliação IA</span>
                </>
              )}
            </button>
          )}

          {/* Parecer da IA */}
          {currentQ.answered && currentQ.aiFeedback && (
            <div
              className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm space-y-2 leading-relaxed ${
                currentQ.aiFeedback.verdict === 'Correto'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : currentQ.aiFeedback.verdict === 'Parcial'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Avaliação: {currentQ.aiFeedback.verdict}</span>
                </span>
                <span
                  className="text-[11px] text-zinc-400 font-normal flex items-center gap-1.5 select-none"
                  title={`Modelo IA: ${modelName}`}
                >
                  <span>Gemini AI</span>
                  {modelName && (
                    <>
                      <span className="opacity-30">•</span>
                      <span className="font-mono text-[10px] text-zinc-400/90 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
                        {modelName}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <p className="leading-relaxed opacity-95 text-xs sm:text-sm">{currentQ.aiFeedback.feedback}</p>
              <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                <button
                  onClick={() => {
                    playQuizAiOpenSound();
                    onDiscussInChat(currentQ, activeIndex);
                  }}
                  className="text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare size={12} />
                  <span>Discutir com Assistente IA</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Caixa de Explicação / Gabarito Comentado (Accordion Suave) */}
      <div
        className={`grid transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          currentQ.showExplanation &&
          (currentQ.explanation || (isOpenType && currentQ.expectedAnswer))
            ? 'grid-rows-[1fr] opacity-100 mt-3'
            : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs sm:text-sm text-zinc-200 space-y-3 shadow-inner">
            {isOpenType && currentQ.expectedAnswer && (
              <div className="space-y-1.5">
                <span className="font-semibold text-amber-300/90 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 rounded-full bg-amber-400"></span>
                  Gabarito de Referência:
                </span>
                <p className="leading-relaxed opacity-95 text-xs sm:text-sm">{currentQ.expectedAnswer}</p>
              </div>
            )}
            {currentQ.explanation && (
              <div className="space-y-1.5">
                <span className="font-semibold text-zinc-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 rounded-full bg-white/40"></span>
                  Explicação Detalhada:
                </span>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                  <FastMarkdown content={currentQ.explanation} className="text-xs sm:text-sm text-zinc-200 leading-relaxed inline" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
