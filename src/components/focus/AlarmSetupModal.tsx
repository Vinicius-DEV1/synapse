import React, { useState } from 'react';
import { Clock, X } from 'lucide-react';
import type { Alarm } from '../types';

interface AlarmSetupModalProps {
  onSave: (alarm: Alarm) => void;
  onCancel: () => void;
  initialTimeStr?: string;
}

const AlarmSetupModal: React.FC<AlarmSetupModalProps> = ({ onSave, onCancel, initialTimeStr = '12:00' }) => {
  const [timeStr, setTimeStr] = useState(initialTimeStr);
  const [label, setLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeStr) return;
    
    onSave({
      time_str: timeStr,
      label: label.trim(),
      is_active: true
    });
  };

  return (
    <div className="absolute inset-0 bg-dark-bg/90 backdrop-blur-sm flex flex-col z-50 animate-in fade-in duration-200">
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto p-4 sm:p-6 pb-32">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <Clock className="text-brand-400" size={32} />
            New Alarm
          </h1>
          <button 
            onClick={onCancel}
            className="p-2 bg-dark-card border border-white/10 rounded-xl text-dark-subtext hover:text-white hover:bg-white/5 transition-all shadow-lg active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-dark-card border border-white/5 p-5 sm:p-6 rounded-2xl shadow-xl">
            <label className="block text-sm font-bold text-dark-subtext uppercase tracking-widest mb-4">
              Time
            </label>
            <input 
              type="time" 
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              required
              className="w-full bg-dark-bg text-4xl sm:text-6xl font-bold text-white tabular-nums tracking-tighter text-center py-6 rounded-xl border border-white/10 focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
            />
          </div>

          <div className="bg-dark-card border border-white/5 p-5 sm:p-6 rounded-2xl shadow-xl">
            <label className="block text-sm font-bold text-dark-subtext uppercase tracking-widest mb-4">
              Label (Optional)
            </label>
            <input 
              type="text" 
              placeholder="e.g., Wake Up, Lunch Break" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={30}
              className="w-full bg-dark-bg text-white text-lg px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 rounded-xl font-bold text-lg text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98]"
          >
            SAVE ALARM
          </button>
        </form>
      </div>
    </div>
  );
};

export default AlarmSetupModal;

