import React from 'react';
import type { Card } from '../types';

interface StudyRatingDockProps {
  showingAnswer: boolean;
  currentCard: Card;
  intervals: string[];
  isRetry: boolean;
  aiFeedback: { verdict: string; feedback: string } | null;
  onRevealAnswer: () => void;
  onAnswerSubmit: () => void;
  onRating: (rating: number) => void;
}

export function StudyRatingDock({
  showingAnswer,
  currentCard,
  intervals,
  isRetry,
  aiFeedback,
  onRevealAnswer,
  onAnswerSubmit,
  onRating,
}: StudyRatingDockProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-8 z-20 flex flex-col items-center lg:items-end gap-4 pointer-events-none w-[92%] max-w-md lg:w-auto">
      {!showingAnswer ? (
        <button
          onClick={() => {
            if (currentCard.card_type === 'typing' || currentCard.card_type === 'cloze') {
              onAnswerSubmit();
            } else {
              onRevealAnswer();
            }
          }}
          className="pointer-events-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center gap-3 w-full lg:w-auto justify-center"
        >
          Mostrar Resposta <span className="opacity-70 text-sm font-normal">(Espaço)</span>
        </button>
      ) : (
        <div className="pointer-events-auto flex flex-row lg:flex-col gap-2 p-2 bg-dark-bg/80 backdrop-blur-xl border border-white/10 rounded-3xl lg:rounded-2xl shadow-2xl w-full lg:w-auto animate-in fade-in slide-in-from-bottom-4 lg:slide-in-from-right-4 duration-300">
          <button
            onClick={() => onRating(1)}
            className="flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card hover:bg-white/5 text-red-400 border border-white/5 hover:border-red-500/30 font-medium transition-all duration-300"
          >
            <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">
              1
            </div>
            <div className="flex flex-col items-center lg:items-start gap-1">
              <span className="text-sm lg:text-base leading-none">Errei</span>
              {intervals[0] && (
                <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">
                  {intervals[0]}
                </span>
              )}
              <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">
                Again
              </span>
            </div>
          </button>
          <button
            onClick={() => onRating(2)}
            disabled={isRetry || aiFeedback?.verdict === 'Incorreto'}
            className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card text-orange-400 border border-white/5 font-medium transition-all duration-300 ${
              isRetry || aiFeedback?.verdict === 'Incorreto'
                ? 'opacity-30 cursor-not-allowed grayscale'
                : 'hover:bg-white/5 hover:border-orange-500/30'
            }`}
          >
            <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">
              2
            </div>
            <div className="flex flex-col items-center lg:items-start gap-1">
              <span className="text-sm lg:text-base leading-none">Difícil</span>
              {intervals[1] && (
                <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">
                  {intervals[1]}
                </span>
              )}
              <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">
                Hard
              </span>
            </div>
          </button>
          <button
            onClick={() => onRating(3)}
            disabled={isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial'}
            className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card text-green-400 border border-white/5 font-medium transition-all duration-300 ${
              isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial'
                ? 'opacity-30 cursor-not-allowed grayscale'
                : 'hover:bg-white/5 hover:border-green-500/30'
            }`}
          >
            <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">
              3
            </div>
            <div className="flex flex-col items-center lg:items-start gap-1">
              <span className="text-sm lg:text-base leading-none">Bom</span>
              {intervals[2] && (
                <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">
                  {intervals[2]}
                </span>
              )}
              <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">
                Good
              </span>
            </div>
          </button>
          <button
            onClick={() => onRating(4)}
            disabled={isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial'}
            className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card text-blue-400 border border-white/5 font-medium transition-all duration-300 ${
              isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial'
                ? 'opacity-30 cursor-not-allowed grayscale'
                : 'hover:bg-white/5 hover:border-blue-500/30'
            }`}
          >
            <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">
              4
            </div>
            <div className="flex flex-col items-center lg:items-start gap-1">
              <span className="text-sm lg:text-base leading-none">Fácil</span>
              {intervals[3] && (
                <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">
                  {intervals[3]}
                </span>
              )}
              <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">
                Easy
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
