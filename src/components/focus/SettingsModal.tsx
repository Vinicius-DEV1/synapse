import React, { useState, useEffect } from 'react';
import { X, Trash2, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface SettingsModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onRefresh }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alarmType, setAlarmType] = useState('beep');
  const [confirmDelete, setConfirmDelete] = useState<'today' | 'last7days' | 'all' | null>(null);

  useEffect(() => {
    setSoundEnabled(localStorage.getItem('soundEnabled') !== 'false');
    setAlarmType(localStorage.getItem('defaultAlarmType') || 'beep');
    if (window.api?.config) {
      window.api.config.get('soundEnabled').then(v => {
        if (v !== null && v !== undefined) setSoundEnabled(v !== 'false');
      }).catch(console.error);
      window.api.config.get('defaultAlarmType').then(v => {
        if (v !== null && v !== undefined) setAlarmType(v as string);
      }).catch(console.error);
    }
  }, []);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('soundEnabled', newVal.toString());
    if (window.api?.config) {
      window.api.config.set('soundEnabled', newVal.toString()).catch(console.error);
    }
    
    if (newVal) {
      playTestSound();
    }
  };

  const playTestSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  const handleDelete = async (type: 'today' | 'last7days' | 'all') => {
    if (window.api) {
      await window.api.focus.deleteSessions({ type });
      onRefresh();
      setConfirmDelete(null);
    }
  };

  return (
    <Portal>
      <div className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
      <div className="bg-dark-card rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-y-auto max-h-[95vh] animate-in fade-in zoom-in duration-200">
        <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            ⚙️ Settings
          </h2>
          <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-8">
          {/* Audio Settings */}
          <div>
            <h3 className="text-sm font-bold text-dark-subtext uppercase tracking-widest mb-4">Preferences</h3>
            <div className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-dark-subtext'}`}>
                  {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </div>
                <div>
                  <p className="font-semibold text-white">Alarm Sound</p>
                  <p className="text-xs text-dark-subtext">Play a sound when timer finishes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {soundEnabled && (
                  <select 
                    value={alarmType} 
                    onChange={(e) => {
                      setAlarmType(e.target.value);
                      localStorage.setItem('defaultAlarmType', e.target.value);
                      if (window.api?.config) {
                        window.api.config.set('defaultAlarmType', e.target.value).catch(console.error);
                      }
                    }}
                    className="bg-dark-bg text-white border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500"
                  >
                    <option value="beep">Digital Beep</option>
                    <option value="retro">Retro Alarm</option>
                    <option value="bell">Tibetan Bell</option>
                  </select>
                )}
                <button 
                  onClick={toggleSound}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${soundEnabled ? 'bg-brand-500' : 'bg-white/20'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div>
            <h3 className="text-sm font-bold text-dark-subtext uppercase tracking-widest mb-4">Data Management</h3>
            <div className="space-y-3">
              {[
                { type: 'today', label: 'Clear Today\'s Data', desc: 'Deletes all sessions from today' },
                { type: 'last7days', label: 'Clear Last 7 Days', desc: 'Deletes sessions from the past week' },
                { type: 'all', label: 'Factory Reset', desc: 'Deletes all sessions completely', danger: true },
              ].map((item) => (
                <div key={item.type} className={`p-4 rounded-xl border ${item.danger ? 'bg-rose-500/5 border-rose-500/20' : 'bg-dark-bg border-white/5'}`}>
                  {confirmDelete === item.type ? (
                    <div className="flex flex-col gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-bold">Are you absolutely sure?</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
                          Cancel
                        </button>
                        <button onClick={() => handleDelete(item.type as any)} className="flex-1 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${item.danger ? 'text-rose-400' : 'text-white'}`}>{item.label}</p>
                        <p className="text-xs text-dark-subtext">{item.desc}</p>
                      </div>
                      <button 
                        onClick={() => setConfirmDelete(item.type as any)}
                        className={`p-2 rounded-lg transition-colors ${item.danger ? 'text-rose-400 hover:bg-rose-500/20' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
};

export default SettingsModal;

