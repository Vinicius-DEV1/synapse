import React from 'react';
import { formatVideoTime } from '../helpers/videoContextHelper';

interface VideoResumePromptProps {
  show: boolean;
  savedProgress: number;
  onRestart: () => void;
  onResume: () => void;
}

export function VideoResumePrompt({
  show,
  savedProgress,
  onRestart,
  onResume,
}: VideoResumePromptProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-200 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center gap-2 text-center text-white">
          <span className="text-4xl mb-1">⏱️</span>
          <h3 className="text-xl font-bold">Continuar assistindo?</h3>
          <p className="text-sm text-white/70">
            Você parou em <span className="text-brand-400 font-bold">{formatVideoTime(savedProgress)}</span>
          </p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onRestart}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Recomeçar
          </button>
          <button
            onClick={onResume}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/25"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
