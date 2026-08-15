import React from 'react';
import { BookOpen, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import type { ReadingStatus } from '../../../types';

interface LibraryBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onStatusChange: (status: ReadingStatus) => void;
  onDelete: () => void;
}

export function LibraryBulkActionsBar({
  selectedCount,
  onClearSelection,
  onStatusChange,
  onDelete
}: LibraryBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-dark-card border border-white/15 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-slide-up">
      <span className="text-sm font-semibold text-white">
        {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
      </span>
      <button
        onClick={onClearSelection}
        className="text-xs text-dark-subtext hover:text-white transition-colors"
      >
        Desmarcar
      </button>
      <div className="h-4 w-px bg-white/15" />
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onStatusChange('reading')}
          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1 transition-colors"
          title="Marcar como Lendo"
        >
          <BookOpen size={13} className="text-emerald-400" />
          Lendo
        </button>
        <button
          onClick={() => onStatusChange('finished')}
          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1 transition-colors"
          title="Marcar como Concluído"
        >
          <CheckCircle2 size={13} className="text-brand-400" />
          Concluído
        </button>
        <button
          onClick={() => onStatusChange('not_started')}
          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1 transition-colors"
          title="Marcar como Não iniciado"
        >
          <Circle size={13} className="text-gray-400" />
          Não iniciado
        </button>
      </div>
      <div className="h-4 w-px bg-white/15" />
      <button
        onClick={onDelete}
        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
      >
        <Trash2 size={13} />
        Excluir ({selectedCount})
      </button>
    </div>
  );
}
