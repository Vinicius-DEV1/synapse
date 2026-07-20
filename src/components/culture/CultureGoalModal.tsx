import React, { useState, useEffect } from 'react';
import { Target, X, Check } from 'lucide-react';
import type { CultureItem } from '../../types';
import { Portal } from '../ui/Portal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  item: CultureItem;
}

export default function CultureGoalModal({ isOpen, onClose, onSave, item }: Props) {
  const [note, setNote] = useState(item.goal_note || '');

  useEffect(() => {
    if (isOpen) setNote(item.goal_note || '');
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(note);
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-dark-card w-full max-w-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-brand-500/10">
          <div className="flex items-center gap-2 text-brand-400">
            <Target size={18} />
            <h3 className="font-semibold text-sm">Objetivo: {item.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <label className="block text-xs font-medium text-dark-subtext mb-2">
            Sua meta para esta obra (opcional):
          </label>
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: Assistir 1 ep por dia, Concluir a saga em 1 ano..."
            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50 resize-none h-24 mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-lg shadow-brand-500/20"
            >
              <Check size={16} />
              Salvar Meta
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
