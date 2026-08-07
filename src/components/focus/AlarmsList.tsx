import React from 'react';
import { Bell, Plus, ArrowLeft, Trash2, Clock } from 'lucide-react';
import type { Alarm } from '../types';

interface AlarmsListProps {
  alarms: Alarm[];
  onBack: () => void;
  onNew: () => void;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}

const AlarmsList: React.FC<AlarmsListProps> = ({ alarms, onBack, onNew, onToggle, onDelete }) => {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-8 animate-in fade-in duration-300">
      <header className="flex justify-between items-center mb-8 sticky top-0 bg-dark-bg/80 backdrop-blur-md z-10 py-4 -mt-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-dark-card border border-white/10 rounded-xl text-dark-subtext hover:text-white hover:bg-white/5 transition-all shadow-lg active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/20 rounded-xl">
              <Bell className="text-brand-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-none">Alarms</h1>
              <p className="text-dark-subtext text-xs font-medium">Manage your daily alerts</p>
            </div>
          </div>
        </div>
        <button onClick={onNew} className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-600/20 active:scale-95 text-sm shrink-0">
          <Plus size={18} />
          <span className="hidden sm:inline">New Alarm</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {alarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-subtext gap-4">
            <Clock size={48} className="opacity-20" />
            <p>No alarms defined yet.</p>
            <button onClick={onNew} className="text-brand-400 font-semibold hover:underline">Create one now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alarms.map(alarm => (
              <div key={alarm.id} className={`p-5 rounded-2xl border transition-all ${alarm.is_active ? 'bg-dark-card border-brand-500/30 shadow-[0_4px_20px_rgba(139,92,246,0.1)]' : 'bg-dark-bg border-white/5 opacity-60'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-4xl font-black tracking-tighter tabular-nums ${alarm.is_active ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-dark-subtext'}`}>
                    {alarm.time_str}
                  </div>
                  <button 
                    onClick={() => alarm.id && onToggle(alarm.id, !alarm.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alarm.is_active ? 'bg-brand-500' : 'bg-white/20'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${alarm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="text-sm font-medium text-dark-subtext truncate pr-4">
                    {alarm.label || 'Alarm'}
                  </div>
                  <button onClick={() => alarm.id && onDelete(alarm.id)} className="p-2 text-dark-subtext hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlarmsList;

