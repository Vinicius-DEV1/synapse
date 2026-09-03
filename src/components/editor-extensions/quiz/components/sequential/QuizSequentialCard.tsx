import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import { markdownComponents, preprocessMarkdownCode } from '../../utils/markdownPreprocess';
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
  return (
    <div className="p-4 md:p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4 shadow-xs relative">
      {/* Header do Card (Tags, Feedback Verdict & Gabarito) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] pb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-white/80 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
            Questão {activeIndex + 1}
          </span>

          {/* Tags */}
          {currentQ.tags && currentQ.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {currentQ.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-dark-subtext"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status / Veredicto */}
        <div className="flex items-center gap-2">
          {currentQ.answered && (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
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
                    <CheckCircle2 size={12} />
                    <span>Correto</span>
                  </>
                ) : (
                  <>
                    <XCircle size={12} />
                    <span>Incorreto</span>
                  </>
                )
              ) : (
                <>
                  <Sparkles size={12} />
                  <span>{currentQ.aiFeedback?.verdict || 'Avaliada'}</span>
                </>
              )}
            </span>
          )}

          {/* Botão Ver Gabarito */}
          {(currentQ.explanation || (currentQ.type === 'open' && currentQ.expectedAnswer)) && (
            <button
              onClick={() =>
                onUpdateSingleQuestion(
                  currentQ.id,
                  { showExplanation: !currentQ.showExplanation },
                  true
                )
              }
              className={`px-2 py-1 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                currentQ.showExplanation
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-dark-subtext hover:text-white'
              }`}
              title="Ver/ocultar explicação e gabarito (Alt+G)"
            >
              <HelpCircle size={13} />
              <span className="text-[10px] hidden sm:inline">Gabarito</span>
            </button>
          )}
        </div>
      </div>

      {/* Enunciado */}
      <div className="text-sm md:text-base font-medium text-white/95 leading-relaxed pt-1">
        {currentQ.question ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {preprocessMarkdownCode(currentQ.question)}
          </ReactMarkdown>
        ) : (
          <span className="italic text-dark-subtext">Questão sem enunciado cadastrado.</span>
        )}
      </div>

      {/* OPÇÕES: MÚLTIPLA ESCOLHA (Grid Clean) */}
      {!isOpenType && currentQ.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          {currentQ.options.map((opt, optIndex) => {
            const letter = String.fromCharCode(65 + optIndex);
            const isSelected = currentQ.selectedIndex === optIndex;
            const isCorrect = optIndex === currentQ.correctIndex;

            let style =
              'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] text-white/90 hover:bg-white/[0.05]';
            let badgeStyle = 'border-white/[0.06] bg-white/[0.04] text-white/70';

            if (currentQ.answered) {
              if (isCorrect) {
                style =
                  'bg-emerald-500/10 border-emerald-500/30 text-emerald-100 font-medium';
                badgeStyle = 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300';
              } else if (isSelected && !isCorrect) {
                style =
                  'bg-rose-500/10 border-rose-500/30 text-rose-200 line-through opacity-80';
                badgeStyle = 'border-rose-500/40 bg-rose-500/20 text-rose-300';
              } else {
                style = 'bg-black/10 border-white/[0.03] text-dark-subtext opacity-40';
                badgeStyle = 'border-white/[0.04] bg-white/[0.02] text-dark-subtext';
              }
            } else if (isSelected) {
              style = 'bg-brand-500/15 border-brand-500/30 text-white font-medium';
              badgeStyle = 'border-brand-500/50 bg-brand-500/30 text-brand-200';
            }

            return (
              <button
                key={optIndex}
                onClick={() => onSelectOption(optIndex)}
                disabled={currentQ.answered}
                className={`p-3 md:p-3.5 rounded-xl border text-xs md:text-sm text-left flex items-center gap-2.5 transition-all cursor-pointer disabled:cursor-default ${style}`}
              >
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-medium text-xs shrink-0 border ${badgeStyle}`}
                >
                  {letter}
                </span>
                <span className="flex-1 leading-snug">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {preprocessMarkdownCode(opt || `Opção ${letter}`)}
                  </ReactMarkdown>
                </span>
                {currentQ.answered && isCorrect && (
                  <Check size={16} className="text-emerald-400 shrink-0" />
                )}
                {currentQ.answered && isSelected && !isCorrect && (
                  <X size={16} className="text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* OPÇÕES: QUESTÃO ABERTA */}
      {isOpenType && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-dark-subtext flex items-center justify-between">
              <span>✍️ Sua Resposta Discursiva:</span>
              <span className="text-[10px] opacity-70">Pressione Enter para enviar para avaliação</span>
            </label>
            <textarea
              value={currentQ.userTypedAnswer || ''}
              onChange={(e) =>
                onUpdateSingleQuestion(currentQ.id, { userTypedAnswer: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (currentQ.userTypedAnswer?.trim() && !currentQ.answered && !isEvaluating) {
                    onEvaluateOpenAnswer(currentQ, activeIndex);
                  }
                }
              }}
              disabled={currentQ.answered || isEvaluating}
              placeholder="Escreva sua resposta completa com clareza..."
              rows={3}
              className="w-full bg-black/20 border border-white/[0.08] rounded-xl p-3 text-xs md:text-sm text-white placeholder-white/20 outline-none focus:border-brand-500/50 resize-none transition-colors"
            />
          </div>

          {!currentQ.answered && (
            <button
              onClick={() => onEvaluateOpenAnswer(currentQ, activeIndex)}
              disabled={!currentQ.userTypedAnswer?.trim() || isEvaluating}
              className="w-full py-2.5 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 disabled:opacity-40 text-brand-200 hover:text-white rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {isEvaluating ? (
                <>
                  <Loader2 size={15} className="animate-spin text-brand-300" />
                  <span>Avaliando com IA do Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-brand-300" />
                  <span>Enviar Resposta para Avaliação IA</span>
                </>
              )}
            </button>
          )}

          {/* Parecer da IA */}
          {currentQ.answered && currentQ.aiFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1.5 leading-relaxed ${
                currentQ.aiFeedback.verdict === 'Correto'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : currentQ.aiFeedback.verdict === 'Parcial'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Avaliação: {currentQ.aiFeedback.verdict}</span>
                </span>
                <span className="text-[10px] opacity-70 font-normal">Gemini AI</span>
              </div>
              <p className="leading-relaxed opacity-95">{currentQ.aiFeedback.feedback}</p>
              <div className="pt-1.5 border-t border-white/[0.06] flex justify-end">
                <button
                  onClick={() => onDiscussInChat(currentQ, activeIndex)}
                  className="text-[10px] font-medium text-dark-subtext hover:text-white px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-colors flex items-center gap-1"
                >
                  <MessageSquare size={11} />
                  <span>Discutir com Assistente IA</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Caixa de Explicação / Gabarito Comentado */}
      {currentQ.showExplanation &&
        (currentQ.explanation || (isOpenType && currentQ.expectedAnswer)) && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white/90 space-y-2">
            {isOpenType && currentQ.expectedAnswer && (
              <div className="space-y-0.5">
                <span className="font-semibold text-amber-300/90 text-[10px] uppercase tracking-wider block">
                  📌 Gabarito de Referência:
                </span>
                <p className="leading-relaxed opacity-90">{currentQ.expectedAnswer}</p>
              </div>
            )}
            {currentQ.explanation && (
              <div className="space-y-0.5">
                <span className="font-semibold text-white/60 text-[10px] uppercase tracking-wider block">
                  💡 Explicação Detalhada:
                </span>
                <div className="text-xs text-white/90">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {preprocessMarkdownCode(currentQ.explanation)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
});
