import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import type { QuestionItem } from '../types';

interface QuizHistorySectionProps {
  question: QuestionItem;
}

export default function QuizHistorySection({ question }: QuizHistorySectionProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (!question.attemptsHistory || question.attemptsHistory.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 font-semibold transition-colors"
      >
        <History size={13} className="text-purple-400" />
        <span>📈 Histórico de Tentativas ({question.attemptsHistory.length})</span>
        {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {showHistory && (
        <div className="mt-2 space-y-2 bg-black/40 border border-purple-500/20 rounded-xl p-3 text-xs max-h-60 overflow-y-auto custom-scrollbar">
          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block border-b border-white/10 pb-1">
            Linha do Tempo de Respostas:
          </span>
          {question.attemptsHistory.map((att, attIdx) => {
            const dateStr = new Date(att.timestamp).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isMc = att.type === 'multiple_choice';
            const isWin = isMc ? att.isCorrect : att.aiFeedback?.verdict === 'Correto';
            const isPartial = !isMc && att.aiFeedback?.verdict === 'Parcial';

            return (
              <div
                key={att.id}
                className={`p-2 rounded-lg border space-y-1 ${
                  isWin
                    ? 'bg-green-500/10 border-green-500/20 text-green-200'
                    : isPartial
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                      : 'bg-red-500/10 border-red-500/20 text-red-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold opacity-90">
                  <span>
                    Tentativa #{question.attemptsHistory!.length - attIdx} • {dateStr}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      isWin
                        ? 'bg-green-500/20 text-green-300'
                        : isPartial
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {isMc
                      ? att.isCorrect
                        ? '✓ Acerto'
                        : '✕ Erro'
                      : att.aiFeedback?.verdict || 'Avaliada'}
                  </span>
                </div>

                {!isMc && att.userTypedAnswer && (
                  <p className="text-[11px] font-mono bg-black/30 p-1.5 rounded border border-white/5 opacity-90 leading-snug">
                    "{att.userTypedAnswer}"
                  </p>
                )}

                {!isMc && att.aiFeedback?.feedback && (
                  <p className="text-[10px] opacity-80 italic">💡 {att.aiFeedback.feedback}</p>
                )}

                {isMc && typeof att.selectedIndex === 'number' && (
                  <p className="text-[11px]">
                    Opção Selecionada:{' '}
                    <strong>
                      {String.fromCharCode(65 + att.selectedIndex)}){' '}
                      {question.options[att.selectedIndex] || ''}
                    </strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
