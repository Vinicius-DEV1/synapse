import  { useState, useRef } from 'react';
import { Mic, Play, Square } from 'lucide-react';

export function MicTestWidget() {
  const [state, setState] = useState<'idle' | 'recording' | 'playing'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setState('recording');
    } catch (e) {
      console.error(e);
      alert('Erro ao acessar microfone para teste.');
    }
  };

  const stopTest = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('idle');
    }
  };

  const playTest = () => {
    if (audioRef.current && audioUrl) {
      setState('playing');
      audioRef.current.play();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {state === 'idle' && (
        <button onClick={startTest} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-dark-subtext hover:text-white transition-colors" title="Testar microfone antes da ligação">
          <Mic size={14} />
        </button>
      )}
      {state === 'idle' && audioUrl && (
        <button onClick={playTest} className="p-2 bg-brand-600/20 text-brand-400 hover:bg-brand-600 hover:text-white rounded-full transition-colors" title="Ouvir áudio gravado">
          <Play size={14} fill="currentColor" />
        </button>
      )}
      {state === 'recording' && (
        <button onClick={stopTest} className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 animate-pulse">
          <Square size={10} fill="currentColor" /> Gravando teste...
        </button>
      )}
      {state === 'playing' && (
        <span className="px-3 py-1.5 text-brand-400 text-[11px] font-medium flex items-center gap-1.5">
          <Play size={10} fill="currentColor" /> Ouvindo teste
        </span>
      )}
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setState('idle')} className="hidden" />}
    </div>
  );
}
