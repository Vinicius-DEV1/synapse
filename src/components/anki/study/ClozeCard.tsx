import React, { useState, useEffect } from 'react';
import type { StudyCardProps } from './ReadingCard';
import { HtmlRenderer } from '../components/HtmlRenderer';

export function ClozeCard({ card, showingAnswer, onAnswerSubmit, evaluating, exactMatch, aiFeedback }: StudyCardProps) {
  const [typedAnswer, setTypedAnswer] = useState('');

  useEffect(() => {
    setTypedAnswer('');
  }, [card.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnswerSubmit(typedAnswer);
  };

  const renderClozeFront = () => {
    const targetC = (card.ord ?? 0) + 1;
    // Attempt to strip HTML tags surrounding cloze to prevent breaking inline formatting
    const cleanFront = card.front.replace(/<\/?p[^>]*>/gi, '');
    const parts = cleanFront.split(/(\{\{c\d+::.*?\}\})/);
    
    return parts.map((part, i) => {
      const match = part.match(/^\{\{c(\d+)::(.*?)\}\}$/);
      if (match) {
        const cNum = parseInt(match[1], 10);
        const word = match[2];
        
        if (cNum === targetC) {
          if (!showingAnswer) {
            return (
              <form onSubmit={handleSubmit} key={i} className="inline-block align-middle mx-1">
                <input 
                  autoFocus
                  type="text" 
                  value={typedAnswer}
                  onChange={e => setTypedAnswer(e.target.value)}
                  className="bg-transparent border-b-2 border-indigo-500 focus:outline-none focus:border-indigo-400 text-center text-indigo-400 pb-1 max-w-full transition-all"
                  style={{ width: `${Math.max(5, typedAnswer.length + 1)}ch` }} 
                  disabled={evaluating}
                />
              </form>
            );
          } else {
            if (card.validation_mode === 'exact') {
              return (
                <span key={i} className={`font-bold border-b-2 pb-1 px-2 mx-1 ${exactMatch ? 'text-green-400 border-green-500' : 'text-red-400 border-red-500'}`}>
                  {typedAnswer || '___'}
                </span>
              );
            } else {
              return (
                <span key={i} className="text-indigo-400 font-bold border-b-2 border-indigo-500 pb-1 px-2 mx-1">
                  {typedAnswer || '___'}
                </span>
              );
            }
          }
        } else {
          return <span key={i} className="text-indigo-300 font-medium">{word}</span>;
        }
      }
      return <span key={i} dangerouslySetInnerHTML={{__html: part}} />;
    });
  };

  return (
    <>
      <div className="flex-1 p-10 flex flex-col items-center justify-center text-center relative">
        <div className="text-3xl font-medium leading-relaxed text-dark-text text-center" style={{ lineHeight: '1.8' }}>
          {renderClozeFront()}
        </div>

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
              <div className="mb-4 text-green-400 font-medium bg-green-500/10 px-4 py-2 rounded-lg">
                Resposta Esperada: {card.front.match(/\{\{c\d+::(.*?)\}\}/)?.[1]}
              </div>
            )}

            {card.back && card.back.trim() !== '' && (
              <div className="mt-4 flex flex-col items-center">
                <span className="text-xs text-dark-subtext uppercase tracking-wider mb-2 font-bold bg-white/5 px-3 py-1 rounded-full">Notas</span>
                <HtmlRenderer html={card.back} className="text-base text-dark-subtext whitespace-pre-wrap leading-relaxed max-w-lg bg-dark-bg p-4 rounded-xl border border-white/5 block" as="div" />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
