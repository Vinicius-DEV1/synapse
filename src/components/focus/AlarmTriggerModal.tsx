import React, { useEffect, useRef } from 'react';
import { Bell, BellOff } from 'lucide-react';
import type { Alarm } from './types';
import { Portal } from '../ui/Portal';

interface AlarmTriggerModalProps {
  alarm: Alarm;
  onDismiss: () => void;
}

const AlarmTriggerModal: React.FC<AlarmTriggerModalProps> = ({ alarm, onDismiss }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  const playAlarm = () => {
    if (localStorage.getItem('soundEnabled') === 'false') return;
    const type = localStorage.getItem('defaultAlarmType') || 'beep';

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    stopAlarm();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 30);
    masterGain.connect(ctx.destination);

    if (type === 'beep') {
      intervalRef.current = window.setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }, 500);
    } else if (type === 'retro') {
      intervalRef.current = window.setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }, 250);
    } else if (type === 'bell') {
      intervalRef.current = window.setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 3);
      }, 4000);
    }
  };

  const stopAlarm = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    playAlarm();
    return () => stopAlarm();
  }, []);

  const handleDismiss = () => {
    stopAlarm();
    onDismiss();
  };

  return (
    <Portal>
      <div className="absolute inset-0 bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] overflow-hidden">
      <div className="bg-dark-card rounded-3xl w-full max-w-sm border border-brand-500/30 shadow-2xl flex flex-col items-center justify-center p-8 relative animate-in zoom-in duration-300">
        <div className="absolute inset-0 bg-brand-500/10 animate-pulse-slow rounded-3xl"></div>
        
        <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 mb-6 relative z-10 ring-4 ring-brand-500/20 animate-bounce">
          <Bell size={40} />
        </div>
        
        <h2 className="text-5xl font-black text-white mb-2 relative z-10 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
          {alarm.time_str}
        </h2>
        
        <p className="text-brand-300 font-medium text-lg relative z-10 text-center mb-10 max-w-full break-words">
          {alarm.label || 'Alarm'}
        </p>

        <button 
          onClick={handleDismiss}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-brand-600/30 relative z-10"
        >
          <BellOff size={24} />
          TURN OFF ALARM
        </button>
      </div>
    </div>
    </Portal>
  );
};

export default AlarmTriggerModal;

