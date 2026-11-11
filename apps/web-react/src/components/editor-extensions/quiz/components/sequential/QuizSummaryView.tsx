import { Trophy, RotateCcw, List } from 'lucide-react';
import type { QuestionItem } from '../../types';

interface QuizSummaryViewProps {
  safeQuestions: QuestionItem[];
  total: number;
  correctCount: number;
  hitPercentage: number;
  onResetAll: () => void;
  onSelectQuestion: (index: number) => void;
  onSwitchToListLayout?: () => void;
}

export function QuizSummaryView({
  safeQuestions,
  total,
  correctCount,
  hitPercentage,
  onResetAll,
  onSelectQuestion,
  onSwitchToListLayout,
}: QuizSummaryViewProps) {
  return (
    <div className="p-6 md:p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-6 animate-scale-in">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-amber-300/90 shadow-xs">
          <Trophy size={28} />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-white">Bateria Concluída!</h3>
          <p className="text-xs text-dark-subtext mt-1">
            Confira seu desempenho geral neste bloco de exercícios:
          </p>
        </div>

        <div className="inline-flex items-center gap-6 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] my-2">
          <div className="text-left">
            <span className="text-[10px] uppercase font-medium text-dark-subtext block">Acertos</span>
            <span className="text-2xl font-bold text-white font-mono">
              {correctCount} <span className="text-sm text-dark-subtext font-normal">/ {total}</span>
            </span>
          </div>
          <div className="h-8 w-px bg-white/[0.06]" />
          <div className="text-left">
            <span className="text-[10px] uppercase font-medium text-dark-subtext block">Aproveitamento</span>
            <span
              className={`text-2xl font-bold font-mono ${
                hitPercentage >= 70
                  ? 'text-emerald-400'
                  : hitPercentage >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
            >
              {hitPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Resumo Rápido de Questões */}
      <div className="space-y-2 max-w-xl mx-auto pt-3 border-t border-white/[0.05]">
        <span className="text-xs font-medium text-dark-subtext uppercase tracking-wider block">
          Questões Respondidas:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {safeQuestions.map((q, idx) => {
            const isCorrect =
              q.type === 'multiple_choice'
                ? q.selectedIndex === q.correctIndex
                : q.aiFeedback?.verdict === 'Correto';
            const isPartial = q.type === 'open' && q.aiFeedback?.verdict === 'Parcial';

            return (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(idx)}
                className={`p-2.5 rounded-xl border text-left text-xs flex items-center justify-between gap-2 transition-all hover:scale-[1.01] ${
                  isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                    : isPartial
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-200'
                }`}
              >
                <span className="font-medium truncate">
                  #{idx + 1}. {q.question || 'Sem enunciado'}
                </span>
                <span className="shrink-0 text-xs font-bold">
                  {isCorrect ? '✓' : isPartial ? '≈' : '✕'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ações Finais */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4 border-t border-white/[0.05]">
        <button
          onClick={onResetAll}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 text-brand-200 hover:text-white rounded-xl text-xs font-medium shadow-xs transition-all"
        >
          <RotateCcw size={13} />
          <span>Refazer Bateria</span>
        </button>

        {onSwitchToListLayout && (
          <button
            onClick={onSwitchToListLayout}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/[0.06] rounded-xl text-xs font-medium transition-colors"
          >
            <List size={13} />
            <span>Ver em Lista Completa</span>
          </button>
        )}

        <button
          onClick={() => onSelectQuestion(0)}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-dark-subtext hover:text-white border border-white/[0.06] rounded-xl text-xs font-medium transition-colors"
        >
          <span>Revisar desde a Questão 1</span>
        </button>
      </div>
    </div>
  );
}
