import React, { useRef, useEffect } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';

interface LinkNotesDrawerProps {
  showNotes: boolean;
  notes: string;
  onChangeNotes: (notes: string) => void;
}

export default function LinkNotesDrawer({ showNotes, notes, onChangeNotes }: LinkNotesDrawerProps) {
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showNotes) {
      const timer = setTimeout(() => notesTextareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [showNotes]);

  if (!showNotes) return null;

  return (
    <div
      className="mt-1.5 bg-dark-card border border-white/10 rounded-lg p-3 transition-all shadow-md animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-300">
          <StickyNote size={13} className="text-brand-400 shrink-0" />
          <span>Anotações do Link</span>
        </div>
        {notes && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChangeNotes('');
            }}
            className="text-[10px] text-dark-subtext hover:text-red-400 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5"
            title="Limpar anotações"
          >
            <Trash2 size={11} />
            <span>Limpar</span>
          </button>
        )}
      </div>
      <textarea
        ref={notesTextareaRef}
        value={notes}
        onChange={(e) => onChangeNotes(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        placeholder="Escreva suas anotações, destaques ou resumo referente a este link aqui..."
        className="w-full bg-black/40 border border-white/10 focus:border-brand-500/50 rounded-md p-2.5 text-xs text-brand-100 placeholder-white/25 outline-none resize-y min-h-[65px] leading-relaxed transition-colors"
        rows={3}
      />
    </div>
  );
}
