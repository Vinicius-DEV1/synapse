import React from 'react';
import { Mic, MicOff, Play, PhoneOff, AlertCircle } from 'lucide-react';
import { MicTestWidget } from './MicTestWidget';

interface PracticeCallBarProps {
  error: string | null;
  isInCall: boolean;
  isMobile: boolean;
  isRecording: boolean;
  micButtonRef: React.RefObject<HTMLButtonElement>;
  onStartCall: () => void;
  onEndCall: () => void;
  isInterview?: boolean;
}

export function PracticeCallBar({
  error,
  isInCall,
  isMobile,
  isRecording,
  micButtonRef,
  onStartCall,
  onEndCall,
  isInterview,
}: PracticeCallBarProps) {
  return (
    <div className="flex items-center justify-end px-4 py-2 bg-dark-card/30 border-b border-white/5 gap-3">
      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-xs px-3 py-1 bg-red-400/10 rounded-full">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {!isInCall && <MicTestWidget />}

      {!isInCall && (
        <button
          onClick={onStartCall}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-500 rounded-full text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 active:scale-95"
        >
          <Play size={14} fill="currentColor" /> {isInterview ? 'INICIAR ENTREVISTA' : 'INICIAR LIGAÇÃO'}
        </button>
      )}

      {isInCall && (
        <>
          {isInterview ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isRecording ? 'Ouvindo...' : 'Microfone Ativo (Realtime)'}
              </span>
            </div>
          ) : isMobile ? (
            <button
              ref={micButtonRef}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 ${
                isRecording
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400 animate-pulse'
                  : 'border-white/10 text-dark-subtext'
              }`}
            >
              {isRecording ? <Mic size={16} /> : <MicOff size={16} />}
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isRecording ? 'Ouvindo...' : 'Toque e segure'}
              </span>
            </button>
          ) : (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                isRecording
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400 animate-pulse'
                  : 'border-white/10 text-dark-subtext'
              }`}
            >
              {isRecording ? <Mic size={14} /> : <MicOff size={14} />}
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isRecording ? 'Ouvindo...' : 'Segure "P"'}
              </span>
            </div>
          )}

          <button
            onClick={onEndCall}
            className="px-4 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PhoneOff size={16} /> Encerrar
          </button>
        </>
      )}
    </div>
  );
}
