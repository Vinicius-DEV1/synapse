import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Music } from 'lucide-react';

import type { Session } from '../types';

interface SuccessModalProps {
  onSave: (summary: string) => void;
  session: Session;
  onResume: (minutes: number) => void;
  onCancel: () => void;
}

const ALARM_TYPES = [
  { id: 'beep', name: 'Digital Beep' },
  { id: 'retro', name: 'Retro Alarm' },
  { id: 'bell', name: 'Tibetan Bell' }
];

const SuccessModal: React.FC<SuccessModalProps> = ({ onSave, session, onResume, onCancel }) => {
  const [summary, setSummary] = useState('');
  const [alarmType, setAlarmType] = useState(localStorage.getItem('defaultAlarmType') || 'beep');
  const [overtime, setOvertime] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setOvertime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Procedural Audio Generation
  const playAlarm = (type: string) => {
    if (localStorage.getItem('soundEnabled') === 'false') return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    stopAlarm(); // Stop any existing alarm

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
        osc.frequency.setValueAtTime(432, ctx.currentTime); // Healing frequency
        
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
    playAlarm(alarmType);
    return () => stopAlarm();
  }, [alarmType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;
    stopAlarm();
    onSave(summary.trim());
  };

  return (
    <div className="absolute inset-0 bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-hidden">
      <div className="bg-dark-card rounded-3xl w-full max-w-md border border-emerald-500/30 shadow-2xl overflow-y-auto max-h-[95vh] animate-in fade-in zoom-in duration-300">
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-500/20 to-transparent relative overflow-hidden sticky top-0 z-10 backdrop-blur-md">
          {/* Confetti / Glow effect */}
          <div className="absolute inset-0 bg-emerald-500/10 animate-pulse-slow"></div>
          
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 relative z-10 ring-4 ring-emerald-500/10">
            <CheckCircle size={32} />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 relative z-10 tracking-tight text-center">Session Complete!</h2>
          <p className="text-emerald-400 font-medium relative z-10 text-center mb-4">
            Great job! You focused for <span className="font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded">{session.target_time_minutes} min</span>.
          </p>

          <div className="text-3xl font-bold text-rose-400 font-mono tracking-widest relative z-10 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 mb-4 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            -{Math.floor(overtime / 60).toString().padStart(2, '0')}:{(overtime % 60).toString().padStart(2, '0')}
          </div>

          {/* Quick Add Buttons */}
          <div className="flex items-center justify-center gap-2 relative z-10 w-full px-2">
            {[1, 5, 10].map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  stopAlarm();
                  onResume(mins);
                }}
                className="flex-1 py-2 rounded-xl bg-dark-bg/80 border border-emerald-500/30 text-emerald-300 text-sm font-bold hover:bg-emerald-500/20 hover:text-emerald-100 transition-colors shadow-lg active:scale-95 backdrop-blur-md"
              >
                +{mins}m
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Alarm Control */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-subtext">
              <Music size={16} className="text-brand-400" /> Alarm Sound
            </div>
            <select 
              value={alarmType} 
              onChange={(e) => setAlarmType(e.target.value)}
              className="bg-dark-bg text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500"
            >
              {ALARM_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-subtext mb-2">
              What did you accomplish?
            </label>
            <textarea 
              placeholder="Summarize your progress..." 
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-white/20 min-h-[100px] resize-none"
              autoFocus
              required
            />
          </div>

          <button 
            type="submit"
            disabled={!summary.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-emerald-600/20"
          >
            TURN OFF ALARM & SAVE
          </button>

          <button 
            type="button"
            onClick={() => {
              stopAlarm();
              onCancel();
            }}
            className="w-full flex justify-center text-sm bg-transparent hover:bg-rose-500/10 text-rose-400 py-3 rounded-xl font-bold transition-all active:scale-[0.98]"
          >
            Abort Session
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuccessModal;

