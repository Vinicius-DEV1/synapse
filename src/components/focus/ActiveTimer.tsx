import React from 'react';
import { XSquare, Play, Pause } from 'lucide-react';
import { useFocusContext } from '../../store/FocusContext';
import type { Session } from './types';

const ActiveTimer: React.FC = () => {
  const { 
    currentSession, 
    timeLeft, 
    isPaused, 
    setIsPaused,
    handleAddQuickTime,
    handleTimerCancel
  } = useFocusContext();

  if (!currentSession) return null;

  const session = currentSession as Session;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const progress = ((session.target_time_minutes * 60 - timeLeft) / (session.target_time_minutes * 60)) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 sm:p-6 overflow-y-auto">
      {/* Background Progress Ring (Optional visual enhancement) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <div 
          className="w-[80vmin] h-[80vmin] rounded-full border-[40px] border-brand-500 transition-all duration-1000"
          style={{ clipPath: `polygon(50% 50%, 50% 0, ${progress > 12.5 ? '100% 0' : `${50 + progress * 4}% 0`}, ${progress > 37.5 ? '100% 100%' : progress > 12.5 ? `100% ${ (progress-12.5)*4 }%` : ''} )` }}
        />
      </div>

      <div className="z-10 flex flex-col items-center w-full max-w-lg mt-16 sm:mt-0">
        {/* Session Info */}
        <div className="bg-dark-card/50 border border-white/5 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 mb-6 sm:mb-12 flex flex-col items-center w-full backdrop-blur-sm shadow-xl shadow-black/20">
          <span className="text-brand-400 font-bold tracking-widest uppercase text-[10px] sm:text-xs mb-1 sm:mb-2">Current Focus</span>
          <h2 className="text-lg sm:text-2xl font-bold text-white mb-2 text-center break-words max-w-full">{session.description}</h2>
          <span className="bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold max-w-full truncate border border-brand-500/10">
            {session.tag}
          </span>
        </div>

        {/* Timer Display */}
        <div className="relative flex items-center justify-center mb-6 sm:mb-12 group w-[min(55vmin,280px)] h-[min(55vmin,280px)] sm:w-[min(60vmin,320px)] sm:h-[min(60vmin,320px)] mx-auto shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" className="stroke-dark-card" strokeWidth="3" />
            <circle cx="50" cy="50" r="48" fill="none" className="stroke-brand-500 transition-all duration-1000 ease-linear" strokeWidth="3" strokeDasharray={`${progress * 3.01} 301`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-[min(12vmin,64px)] sm:text-7xl font-light font-mono tabular-nums leading-none tracking-tight ${timeLeft <= 60 && timeLeft > 0 ? 'text-red-500' : 'text-white'}`}>
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </div>
            {isPaused && (
              <span className="text-brand-400 text-sm mt-2 uppercase tracking-widest font-bold">Paused</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 w-full shrink-0">
          <button
            onClick={() => handleAddQuickTime(5)}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-dark-card border border-white/5 text-white/50 hover:text-white hover:border-white/20 transition-all flex items-center justify-center font-bold font-mono text-sm sm:text-base"
          >
            +5m
          </button>
          
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand-500 text-dark-bg hover:bg-brand-400 hover:scale-105 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center"
          >
            {isPaused ? <Play size={28} className="sm:w-8 sm:h-8" /> : <Pause size={28} className="sm:w-8 sm:h-8" />}
          </button>

          <button
            onClick={handleTimerCancel}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-dark-card border border-white/5 text-red-400/50 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/5 transition-all flex items-center justify-center"
          >
            <XSquare size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveTimer;
