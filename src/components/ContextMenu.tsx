import { FilePlus, Edit2, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  pageId: string;
  onCreateSubPage: (parentId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export default function ContextMenu({ x, y, pageId, onCreateSubPage, onDelete, onRename }: ContextMenuProps) {
  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 150);

  return (
    <div
      className="fixed z-50 w-48 bg-dark-card border border-white/10 rounded-xl shadow-2xl py-1 animate-scale-in"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onCreateSubPage(pageId);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/5 transition-colors"
      >
        <FilePlus size={14} className="text-dark-subtext" />
        Nova sub-página
      </button>

      <div className="h-px bg-white/5 my-1 mx-2" />

      <button
        onClick={() => {
          // Trigger double click on the item somehow, or handle rename globally
          // For now, we'll just prompt (not ideal, but functional as fallback)
          const newTitle = prompt('Novo nome:');
          if (newTitle && newTitle.trim()) {
            onRename(pageId, newTitle.trim());
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/5 transition-colors"
      >
        <Edit2 size={14} className="text-dark-subtext" />
        Renomear
      </button>

      <button
        onClick={() => {
          onDelete(pageId);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={14} />
        Excluir
      </button>
    </div>
  );
}
