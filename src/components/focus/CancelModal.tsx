import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface CancelModalProps {
  onSave: (justification: string) => void;
}

const CancelModal: React.FC<CancelModalProps> = ({ onSave }) => {
  const [justification, setJustification] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return;
    onSave(justification.trim());
  };

  return (
    <Portal>
      <div className="absolute inset-0 bg-dark-bg/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-hidden">
      <div className="bg-dark-card rounded-3xl w-full max-w-md border border-rose-500/30 shadow-2xl overflow-y-auto max-h-[95vh] animate-in fade-in zoom-in duration-200">
        <div className="p-5 sm:p-6 border-b border-rose-500/10 flex items-center gap-3 bg-rose-500/5 sticky top-0 z-10 backdrop-blur-md">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Session Aborted</h2>
            <p className="text-xs text-rose-400 font-medium">Accountability required</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-subtext mb-2">
              Why did you cancel this session?
            </label>
            <textarea 
              placeholder="Be honest with yourself..." 
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder:text-white/20 min-h-[120px] resize-none"
              autoFocus
              required
            />
          </div>

          <button 
            type="submit"
            disabled={!justification.trim()}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-rose-600/20"
          >
            SAVE & RETURN
          </button>
        </form>
      </div>
    </div>
    </Portal>
  );
};

export default CancelModal;

