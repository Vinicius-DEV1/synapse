import { BookOpen, CheckCircle2, Circle, Trash2, Archive, ArchiveRestore, FolderPlus } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { LibraryCollection, ReadingStatus } from '../../../types';

interface LibraryBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onStatusChange: (status: ReadingStatus) => void;
  onDelete: () => void;
  isViewingArchived?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  collections?: LibraryCollection[];
  onAssignCollection?: (collectionId: string) => void;
}

export function LibraryBulkActionsBar({
  selectedCount,
  onClearSelection,
  onStatusChange,
  onDelete,
  isViewingArchived = false,
  onArchive,
  onUnarchive,
  collections = [],
  onAssignCollection,
}: LibraryBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-dark-card border border-white/15 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3.5 flex-wrap animate-slide-up backdrop-blur-md">
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

      {/* Reading Status Actions */}
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

      {/* Assign to Collection Action */}
      {collections.length > 0 && onAssignCollection && (
        <>
          <div className="h-4 w-px bg-white/15" />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="px-2.5 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-brand-500/20"
                title="Adicionar à Coleção"
              >
                <FolderPlus size={13} />
                Coleção
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[180px] max-h-56 overflow-y-auto bg-dark-card border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95"
                sideOffset={6}
                align="center"
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                  Adicionar a:
                </div>
                {collections.map((col) => (
                  <DropdownMenu.Item
                    key={col.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                    onSelect={() => onAssignCollection(col.id)}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="truncate">{col.name}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </>
      )}

      {/* Archive / Unarchive Action */}
      {(onArchive || onUnarchive) && (
        <>
          <div className="h-4 w-px bg-white/15" />
          {isViewingArchived && onUnarchive ? (
            <button
              onClick={onUnarchive}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-amber-500/25"
              title="Restaurar livros para a biblioteca ativa"
            >
              <ArchiveRestore size={13} />
              Desarquivar
            </button>
          ) : onArchive ? (
            <button
              onClick={onArchive}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Mover para os arquivados"
            >
              <Archive size={13} className="text-amber-400" />
              Arquivar
            </button>
          ) : null}
        </>
      )}

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

