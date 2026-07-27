import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import type { StudyCardProps } from './ReadingCard';
import { HtmlRenderer } from '../components/HtmlRenderer';

export function ListeningCard({ card, showingAnswer, playAudio }: StudyCardProps) {
  return (
    <>
      <div className="flex-1 p-10 flex flex-col items-center justify-center text-center relative">
        <button 
          onClick={playAudio}
          className="w-24 h-24 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-500/20 hover:scale-105 transition-all duration-300 cursor-pointer shadow-[0_0_30px_rgba(99,102,241,0.1)]"
        >
          <Volume2 className="w-10 h-10" />
        </button>
      </div>

      {showingAnswer && (
        <>
          <div className="h-px w-full bg-white/5" />
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-dark-card animate-in fade-in slide-in-from-bottom-4 duration-300">
            <HtmlRenderer html={card.front} className="text-lg text-dark-text font-medium mb-4 block" as="div" />
            <HtmlRenderer html={card.back} className="text-base text-dark-subtext whitespace-pre-wrap leading-relaxed block" as="div" />
            {card.media_url && (
              <button onClick={playAudio} className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm text-white transition-colors">
                <Volume2 className="w-4 h-4" /> Ouvir Novamente
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
