import React from 'react';
import { Loader2, PhoneOff, AlertCircle } from 'lucide-react';
import type { TutorSession } from '../../../types';

interface PracticeCallControlsProps {
  session: TutorSession;
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  micLabel: string;
  error: string | null;
  liveTranscript: string;
  visualizerRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onEndCall: () => void;
}

export function PracticeCallControls({
  session,
  isConnected,
  isRecording,
  isPlaying,
  micLabel,
  error,
  liveTranscript,
  visualizerRefs,
  onEndCall
}: PracticeCallControlsProps) {
  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-dark-bg/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Fundo dinâmico */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/10 via-dark-bg/90 to-dark-bg/95 pointer-events-none"></div>

      <div className="absolute top-8 left-8 z-10">
        <h2 className="text-xl font-bold tracking-tight text-white/90">{session.title}</h2>
        <div className="text-brand-400 text-sm mt-1 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          Chamada Ativa
        </div>
      </div>
      
      {/* Centro da Tela: Aura e Transcrição */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl px-8 pb-40">
        
        {/* Status Text */}
        <div className={`mb-12 transition-opacity duration-500 ${liveTranscript ? 'opacity-0' : 'opacity-100'}`}>
          <h3 className="text-xl font-medium text-white/50 tracking-widest uppercase">
            {!isConnected ? 'Conectando ao servidor...' : isRecording ? 'Ouvindo...' : isPlaying ? 'IA Falando...' : 'Fale comigo'}
          </h3>
        </div>

        {/* Visualizer Orb (Glassmorphism) */}
        <div className="relative flex items-center justify-center w-48 h-48 mb-8">
          <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${isRecording ? 'bg-brand-500/40 scale-150 opacity-100' : isPlaying ? 'bg-sky-500/40 scale-125 opacity-90' : isConnected ? 'bg-white/10 scale-110 opacity-50 animate-pulse' : 'bg-transparent scale-75 opacity-0'}`}></div>
          
          <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden backdrop-blur-xl border border-white/20 ${
            isRecording ? 'bg-white/10 shadow-[0_0_80px_rgba(168,85,247,0.5)] scale-110' : 
            isPlaying ? 'bg-white/10 shadow-[0_0_80px_rgba(14,165,233,0.5)] scale-105' :
            isConnected ? 'bg-white/5 shadow-[0_0_40px_rgba(255,255,255,0.05)]' : 
            'bg-transparent border-white/5'
          }`}>
            {isRecording ? (
              <div className="flex gap-1.5 h-12 items-center">
                {[0, 1, 2, 3, 4].map(i => (
                  <div 
                    key={i}
                    ref={el => { visualizerRefs.current[i] = el; }}
                    className="w-1.5 bg-gradient-to-t from-brand-300 to-brand-100 rounded-full transition-all duration-[50ms]" 
                    style={{ height: '12px' }}
                  ></div>
                ))}
              </div>
            ) : isPlaying ? (
              <div className="flex gap-1.5 h-12 items-center">
                {[0, 1, 2, 3, 4].map(i => (
                  <div 
                    key={i}
                    ref={el => { visualizerRefs.current[i] = el; }}
                    className="w-1.5 bg-gradient-to-t from-sky-300 to-sky-100 rounded-full transition-all duration-[50ms]" 
                    style={{ height: '12px' }}
                  ></div>
                ))}
              </div>
            ) : !isConnected ? (
              <Loader2 size={32} className="text-white/50 animate-spin" />
            ) : (
              <div className="flex gap-1.5 h-12 items-center">
                {[0, 1, 2, 3, 4].map(i => (
                  <div 
                    key={i}
                    ref={el => { visualizerRefs.current[i] = el; }}
                    className="w-1.5 bg-white/40 rounded-full transition-all duration-[50ms]" 
                    style={{ height: '12px' }}
                  ></div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Live Transcript */}
        <div className="min-h-[120px] flex items-center justify-center w-full">
          {liveTranscript && (
            <p className="text-3xl md:text-4xl font-bold text-center leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/50 animate-in fade-in slide-in-from-bottom-4 drop-shadow-lg max-w-3xl">
              {liveTranscript}
            </p>
          )}
        </div>
      </div>
      
      {/* Bottom Dock */}
      <div className="absolute bottom-10 z-20 flex flex-col items-center w-full max-w-sm px-4">
        {!isConnected && (
          <p className="text-sm text-dark-subtext mb-4">Estabelecendo comunicação segura de baixa latência...</p>
        )}

        <div className="flex flex-col items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl w-full">
          {isConnected && (
            <>
              <div className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${isRecording ? 'opacity-20' : 'opacity-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/60">Mantenha pressionado</span>
                  <kbd className="px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-sm shadow-inner">P</kbd>
                  <span className="text-sm font-medium text-white/60">para falar</span>
                </div>
                {micLabel && <span className="text-[11px] font-semibold tracking-wider uppercase text-white/30">{micLabel}</span>}
              </div>
              <div className="w-full h-px bg-white/5"></div>
            </>
          )}
          
          <button 
            onClick={onEndCall} 
            className="w-full py-3 px-8 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Encerrar Ligação"
          >
            <PhoneOff size={18} />
            <span className="font-semibold text-sm tracking-wide">Encerrar Chamada</span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm shadow-xl z-50">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
