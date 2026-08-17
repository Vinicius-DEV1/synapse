import { FolderUp, X } from 'lucide-react';

interface FilesBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMoveSelected: () => void;
  onDeleteSelected: () => void;
}

export function FilesBulkActionsBar({
  selectedCount,
  onClearSelection,
  onMoveSelected,
  onDeleteSelected
}: FilesBulkActionsBarProps) {
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
      <button
        onClick={onMoveSelected}
        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
      >
        <FolderUp size={13} />
        Mover ({selectedCount})
      </button>
      <button
        onClick={onDeleteSelected}
        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
      >
        <X size={13} />
        Excluir ({selectedCount})
      </button>
    </div>
  );
}
