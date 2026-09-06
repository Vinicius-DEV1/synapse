import { useState, useEffect, type MutableRefObject } from 'react';
import { Loader2, PhoneOff, AlertCircle, UserCheck, CircleDot, X } from 'lucide-react';
import type { TutorSession, InterviewConfig } from '../../../types';
import { InterviewAvatar } from './avatar/InterviewAvatar';

interface PracticeCallControlsProps {
  session: TutorSession;
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  micLabel: string;
  error: string | null;
  liveTranscript: string;
  visualizerRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  onEndCall: () => void;
  interviewConfig?: InterviewConfig | null;
  playbackAnalyserRef?: MutableRefObject<AnalyserNode | null>;
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
  onEndCall,
  interviewConfig,
  playbackAnalyserRef,
}: PracticeCallControlsProps) {
  const [viewMode, setViewMode] = useState<'avatar' | 'orb'>(interviewConfig ? 'avatar' : 'orb');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (error) setIsDismissed(false);
  }, [error]);

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-dark-bg flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Fundo dinâmico */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/10 via-dark-bg/90 to-dark-bg pointer-events-none"></div>

      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-6 sm:px-8 sm:py-6 pointer-events-none">
        <div className="pointer-events-auto">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white/90 truncate max-w-xs sm:max-w-md">{session.title}</h2>
          <div className="text-brand-400 text-xs sm:text-sm mt-0.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            {interviewConfig ? 'Simulador de Entrevista Ativo' : 'Chamada Ativa'}
          </div>
        </div>

        {/* Mode Switcher Toggle (if interview session) */}
        {interviewConfig && (
          <div className="pointer-events-auto flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md shadow-lg">
            <button
              onClick={() => setViewMode('avatar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'avatar'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-dark-subtext hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              Avatar 2D
            </button>
            <button
              onClick={() => setViewMode('orb')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'orb'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-dark-subtext hover:text-white'
              }`}
            >
              <CircleDot size={14} />
              Orbe Sonoro
            </button>
          </div>
        )}
      </div>
      
      {/* Centro da Tela: Avatar ou Orbe + Transcrição */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl px-8 pb-40">
        
        {/* Status Text (only when not in avatar mode) */}
        {viewMode !== 'avatar' && (
          <div className={`mb-6 transition-opacity duration-500 ${liveTranscript ? 'opacity-0' : 'opacity-100'}`}>
            <h3 className="text-sm font-medium text-white/50 tracking-widest uppercase">
              {!isConnected
                ? 'Conectando ao entrevistador...'
                : isRecording
                ? 'Ouvindo sua resposta...'
                : isPlaying
                ? 'Entrevistador falando...'
                : interviewConfig
                ? 'Aguardando sua fala...'
                : 'Pressione P para responder'}
            </h3>
          </div>
        )}

        {/* Visual: Avatar 2D vs Visualizer Orb */}
        {viewMode === 'avatar' && interviewConfig ? (
          <div className="mb-4">
            <InterviewAvatar
              isPlaying={isPlaying}
              isRecording={isRecording}
              playbackAnalyserRef={playbackAnalyserRef || { current: null }}
              jobTitle={interviewConfig.jobTitle}
            />
          </div>
        ) : (
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
        )}
        
        {/* Live Transcript */}
        <div className="min-h-[100px] flex items-center justify-center w-full">
          {liveTranscript && (
            <p className="text-2xl md:text-3xl font-bold text-center leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/50 animate-in fade-in slide-in-from-bottom-4 drop-shadow-lg max-w-3xl">
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
              {interviewConfig ? (
                <div className="flex items-center gap-2.5 py-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecording ? 'bg-purple-400' : isPlaying ? 'bg-sky-400' : 'bg-emerald-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRecording ? 'bg-purple-500' : isPlaying ? 'bg-sky-500' : 'bg-emerald-500'}`}></span>
                  </span>
                  <span className="text-xs font-semibold text-white/90">
                    {isRecording ? 'Ouvindo sua resposta...' : isPlaying ? 'Entrevistador falando...' : 'Microfone Aberto • Fale naturalmente'}
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${isRecording ? 'opacity-20' : 'opacity-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/60">Mantenha pressionado</span>
                    <kbd className="px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-sm shadow-inner">P</kbd>
                    <span className="text-sm font-medium text-white/60">para falar</span>
                  </div>
                  {micLabel && <span className="text-[11px] font-semibold tracking-wider uppercase text-white/30">{micLabel}</span>}
                </div>
              )}
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
      
      {error && !isDismissed && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-200 text-xs sm:text-sm font-medium shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 max-w-lg text-center">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <span className="truncate">{error}</span>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-white/10 rounded-full text-red-300 hover:text-white transition-colors ml-1 shrink-0"
            title="Fechar aviso"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
