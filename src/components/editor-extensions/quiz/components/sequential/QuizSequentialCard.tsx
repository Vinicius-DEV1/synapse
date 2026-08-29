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
    <div className="p-4 md:p-5 bg-dark-bg/70 border border-white/10 rounded-xl space-y-3.5 shadow-lg relative">
      {/* Header do Card (Tags, Feedback Verdict & Gabarito) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
            Questão {activeIndex + 1}
          </span>

          {/* Tags */}
          {currentQ.tags && currentQ.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {currentQ.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-dark-subtext"
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
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                currentQ.type === 'multiple_choice'
                  ? currentQ.selectedIndex === currentQ.correctIndex
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : currentQ.aiFeedback?.verdict === 'Correto'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : currentQ.aiFeedback?.verdict === 'Parcial'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
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
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-dark-subtext hover:text-white'
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
      <div className="text-sm md:text-[15px] font-semibold text-white leading-snug md:leading-relaxed">
        {currentQ.question ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {preprocessMarkdownCode(currentQ.question)}
          </ReactMarkdown>
        ) : (
          <span className="italic text-dark-subtext">Questão sem enunciado cadastrado.</span>
        )}
      </div>

      {/* OPÇÕES: MÚLTIPLA ESCOLHA (Kahoot Style) */}
      {!isOpenType && currentQ.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {currentQ.options.map((opt, optIndex) => {
            const letter = String.fromCharCode(65 + optIndex);
            const isSelected = currentQ.selectedIndex === optIndex;
            const isCorrect = optIndex === currentQ.correctIndex;

            let style =
              'bg-white/5 border-white/10 hover:border-brand-500/40 text-white/90 hover:bg-white/10';

            if (currentQ.answered) {
              if (isCorrect) {
                style =
                  'bg-green-500/20 border-green-500/60 text-green-100 font-semibold shadow-md shadow-green-950/40';
              } else if (isSelected && !isCorrect) {
                style =
                  'bg-red-500/20 border-red-500/60 text-red-200 line-through opacity-80';
              } else {
                style = 'bg-black/20 border-white/5 text-dark-subtext opacity-40';
              }
            } else if (isSelected) {
              style = 'bg-brand-500/20 border-brand-500 text-white font-semibold';
            }

            return (
              <button
                key={optIndex}
                onClick={() => onSelectOption(optIndex)}
                disabled={currentQ.answered}
                className={`p-3 md:p-3.5 rounded-xl border text-xs md:text-sm text-left flex items-center gap-2.5 transition-all cursor-pointer disabled:cursor-default ${style}`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                    isSelected
                      ? 'bg-brand-500 border-brand-400 text-white shadow-sm'
                      : 'border-white/10 bg-black/40 text-dark-subtext'
                  }`}
                >
                  {letter}
                </span>
                <span className="flex-1 leading-snug">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {preprocessMarkdownCode(opt || `Opção ${letter}`)}
                  </ReactMarkdown>
                </span>
                {currentQ.answered && isCorrect && (
                  <Check size={16} className="text-green-400 shrink-0" />
                )}
                {currentQ.answered && isSelected && !isCorrect && (
                  <X size={16} className="text-red-400 shrink-0" />
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
            <label className="text-xs font-semibold text-dark-subtext flex items-center justify-between">
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
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs md:text-sm text-white placeholder-white/20 outline-none focus:border-brand-500 resize-none transition-colors"
            />
          </div>

          {!currentQ.answered && (
            <button
              onClick={() => onEvaluateOpenAnswer(currentQ, activeIndex)}
              disabled={!currentQ.userTypedAnswer?.trim() || isEvaluating}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
            >
              {isEvaluating ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Avaliando com IA do Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Enviar Resposta para Avaliação IA</span>
                </>
              )}
            </button>
          )}

          {/* Parecer da IA */}
          {currentQ.answered && currentQ.aiFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                currentQ.aiFeedback.verdict === 'Correto'
                  ? 'bg-green-500/10 border-green-500/30 text-green-200'
                  : currentQ.aiFeedback.verdict === 'Parcial'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Avaliação: {currentQ.aiFeedback.verdict}</span>
                </span>
                <span className="text-[10px] opacity-70 font-normal">Gemini AI</span>
              </div>
              <p className="leading-relaxed opacity-95">{currentQ.aiFeedback.feedback}</p>
              <div className="pt-1.5 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => onDiscussInChat(currentQ, activeIndex)}
                  className="text-[10px] font-semibold text-brand-300 hover:text-white px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1"
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
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs text-brand-100 space-y-1.5 shadow-inner">
            {isOpenType && currentQ.expectedAnswer && (
              <div className="space-y-0.5">
                <span className="font-bold text-brand-300 text-[10px] block">
                  📌 Gabarito de Referência:
                </span>
                <p className="leading-relaxed opacity-90">{currentQ.expectedAnswer}</p>
              </div>
            )}
            {currentQ.explanation && (
              <div className="space-y-0.5">
                <span className="font-bold text-brand-300 text-[10px] block">
                  💡 Explicação Detalhada:
                </span>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {preprocessMarkdownCode(currentQ.explanation)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
    </div>
  );
});
