import React, { useState, useEffect } from 'react';
import type { StudyCardProps } from './ReadingCard';
import { HtmlRenderer } from '../components/HtmlRenderer';

export function TypingCard({ card, showingAnswer, onAnswerSubmit, evaluating, exactMatch, aiFeedback }: StudyCardProps) {
  const [typedAnswer, setTypedAnswer] = useState('');

  // Limpa o input sempre que o cartão mudar
  useEffect(() => {
    setTypedAnswer('');
  }, [card.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnswerSubmit(typedAnswer);
  };

  return (
    <>
      <div className="flex-1 p-10 flex flex-col items-center justify-center text-center relative">
        <HtmlRenderer html={card.front} className="text-3xl font-medium leading-relaxed text-dark-text block" as="div" />
        
        {!showingAnswer && (
          <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm">
            <input 
              autoFocus
              type="text"
              value={typedAnswer}
              onChange={e => setTypedAnswer(e.target.value)}
              placeholder="Digite a resposta..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={evaluating}
            />
          </form>
        )}
        
        {showingAnswer && card.validation_mode === 'exact' && (
          <div className={`mt-8 px-6 py-3 rounded-xl border ${exactMatch ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} text-xl font-medium`}>
            Sua resposta: {typedAnswer || 'Em branco'}
          </div>
        )}
        
        {showingAnswer && card.validation_mode === 'ai' && (
          <div className={`mt-8 px-6 py-3 rounded-xl border bg-indigo-500/10 border-indigo-500/30 text-indigo-400 text-xl font-medium`}>
            Sua resposta: {typedAnswer || 'Em branco'}
          </div>
        )}

        {evaluating && (
          <div className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-t-2xl z-10">
            <p className="text-indigo-300 font-medium animate-pulse">IA analisando sua resposta...</p>
          </div>
        )}
      </div>

      {showingAnswer && (
        <>
          <div className="h-px w-full bg-white/5" />
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-dark-card animate-in fade-in slide-in-from-bottom-4 duration-300">
            {aiFeedback && (
              <div className={`mb-6 w-full max-w-md p-4 rounded-xl border ${
                  aiFeedback.verdict === 'Correto' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
                  aiFeedback.verdict === 'Parcial' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
                  'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="font-bold text-lg">IA: {aiFeedback.verdict}</span>
                  </div>
                  <p className="text-sm opacity-90">{aiFeedback.feedback}</p>
              </div>
            )}

            {card.validation_mode === 'exact' && !exactMatch && (
              <div className="mb-4 text-green-400 font-medium bg-green-500/10 px-4 py-2 rounded-lg">Resposta Esperada: {card.back}</div>
            )}

            <HtmlRenderer html={card.back} className="text-base text-dark-subtext whitespace-pre-wrap leading-relaxed block" as="div" />
          </div>
        </>
      )}
    </>
  );
}
