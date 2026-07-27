import React, { useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import type { StudyCardProps } from './ReadingCard';
import { HtmlRenderer } from '../components/HtmlRenderer';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export function SpeakingCard({ card, showingAnswer, onAnswerSubmit, evaluating, aiFeedback }: StudyCardProps) {
  const { isRecording, startRecording, stopRecording } = useAudioRecorder((base64) => {
    onAnswerSubmit(undefined, base64);
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showingAnswer) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (isRecording) stopRecording();
        else startRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showingAnswer, isRecording, startRecording, stopRecording]);

  return (
    <>
      <div className="flex-1 p-10 flex flex-col items-center justify-center text-center relative">
        <HtmlRenderer html={card.front} className="text-3xl font-medium leading-relaxed text-dark-text block" as="div" />
        
        {!showingAnswer && (
          <div className="mt-8 flex flex-col items-center">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                disabled={evaluating}
                className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-500/20 hover:scale-105 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-50"
              >
                <Mic className="w-8 h-8" />
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center hover:bg-red-500/30 hover:scale-105 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse"
              >
                <Square className="w-8 h-8" />
              </button>
            )}
            <p className="text-dark-subtext mt-4 font-medium">
              {isRecording ? 'Gravando... Clique para parar e avaliar' : 'Clique ou aperte "R" para falar a resposta'}
            </p>
          </div>
        )}

        {showingAnswer && card.validation_mode === 'ai' && (
          <div className="mt-8 px-6 py-3 rounded-xl border bg-indigo-500/10 border-indigo-500/30 text-indigo-400 text-xl font-medium flex items-center gap-2">
            <Mic className="w-5 h-5" /> Resposta em áudio avaliada pela IA
          </div>
        )}

        {evaluating && (
          <div className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-t-2xl z-10">
            <p className="text-indigo-300 font-medium animate-pulse">IA analisando sua pronúncia...</p>
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
                {aiFeedback.transcription && (
                    <div className="mt-3 pt-3 border-t border-current/20 text-left">
                        <p className="text-[11px] opacity-75 mb-1 uppercase tracking-wider font-semibold">Transcrição da Fala:</p>
                        <p className="text-sm font-medium italic opacity-90">"{aiFeedback.transcription}"</p>
                    </div>
                )}
              </div>
            )}
            
            <HtmlRenderer html={card.back} className="text-base text-dark-subtext whitespace-pre-wrap leading-relaxed block" as="div" />
          </div>
        </>
      )}
    </>
  );
}
