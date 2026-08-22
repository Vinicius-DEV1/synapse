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
    <div className="p-6 md:p-8 bg-dark-bg/60 border border-white/10 rounded-2xl space-y-6 animate-scale-in">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400 shadow-xl shadow-brand-500/10">
          <Trophy size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Bateria Concluída!</h3>
          <p className="text-xs text-dark-subtext mt-1">
            Confira seu desempenho geral neste bloco de exercícios:
          </p>
        </div>

        <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 my-2">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-dark-subtext block">Acertos</span>
            <span className="text-2xl font-bold text-white font-mono">
              {correctCount} <span className="text-sm text-dark-subtext">/ {total}</span>
            </span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-dark-subtext block">Aproveitamento</span>
            <span
              className={`text-2xl font-bold font-mono ${
                hitPercentage >= 70
                  ? 'text-green-400'
                  : hitPercentage >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {hitPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Resumo Rápido de Questões */}
      <div className="space-y-2 max-w-xl mx-auto pt-2 border-t border-white/5">
        <span className="text-xs font-bold text-dark-subtext uppercase tracking-wider block">
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
                    ? 'bg-green-500/10 border-green-500/30 text-green-200'
                    : isPartial
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}
              >
                <span className="font-semibold truncate">
                  #{idx + 1}. {q.question || 'Sem enunciado'}
                </span>
                <span className="shrink-0 text-xs">
                  {isCorrect ? '✓' : isPartial ? '≈' : '✕'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ações Finais */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/5">
        <button
          onClick={onResetAll}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
        >
          <RotateCcw size={14} />
          <span>Refazer Bateria</span>
        </button>

        {onSwitchToListLayout && (
          <button
            onClick={onSwitchToListLayout}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-brand-200 border border-white/10 rounded-xl text-xs font-medium transition-colors"
          >
            <List size={14} />
            <span>Ver em Lista Completa</span>
          </button>
        )}

        <button
          onClick={() => onSelectQuestion(0)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-colors"
        >
          <span>Revisar desde a Questão 1</span>
        </button>
      </div>
    </div>
  );
}
