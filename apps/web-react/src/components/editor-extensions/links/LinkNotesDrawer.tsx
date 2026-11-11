import { useRef, useEffect } from 'react';
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
      className="border-t border-white/[0.08] bg-black/25 p-3 rounded-b-[inherit] animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
          <StickyNote size={13} className="text-zinc-400 shrink-0" />
          <span>Anotações do Link</span>
        </div>
        {notes && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChangeNotes('');
            }}
            className="text-[10px] text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
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
        className="w-full bg-black/30 border border-white/[0.08] focus:border-white/25 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-y min-h-[65px] leading-relaxed transition-colors"
        rows={3}
      />
    </div>
  );
}
