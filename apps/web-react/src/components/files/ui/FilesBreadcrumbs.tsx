import React, { useState } from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';
import type { BreadcrumbItem } from '../utils/filesHierarchy';

interface FilesBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
  onDropOnFolder?: (targetFolderId: string | null, payload?: { id: string; isFolder: boolean } | null) => void;
}

export const FilesBreadcrumbs: React.FC<FilesBreadcrumbsProps> = ({
  breadcrumbs,
  onNavigate,
  onDropOnFolder,
}) => {
  const [dragOverId, setDragOverId] = useState<string | 'root' | null>(null);

  const handleDragOver = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(id === null ? 'root' : id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    let payload: { id: string; isFolder: boolean } | null = null;
    try {
      const raw = e.dataTransfer.getData('application/json') || window.sessionStorage.getItem('caderno_internal_drag');
      if (raw) payload = JSON.parse(raw);
    } catch {
      // Ignore
    }
    if (onDropOnFolder) {
      onDropOnFolder(id, payload);
    }
  };

  return (
    <nav
      aria-label="Caminho de navegação"
      className="flex items-center gap-1 text-xs text-zinc-400 overflow-x-auto py-1 scrollbar-none select-none min-w-0"
    >
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        const isDragTarget =
          (crumb.id === null && dragOverId === 'root') ||
          (crumb.id !== null && dragOverId === crumb.id);

        return (
          <React.Fragment key={crumb.id ?? 'root'}>
            {idx > 0 && (
              <ChevronRight
                size={13}
                className="text-white/20 shrink-0 mx-0.5"
                aria-hidden="true"
              />
            )}

            <button
              type="button"
              onClick={() => onNavigate(crumb.id)}
              onDragOver={(e) => handleDragOver(e, crumb.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, crumb.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors truncate max-w-[160px] ${
                isLast
                  ? 'text-white font-medium bg-white/[0.06]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              } ${
                isDragTarget
                  ? 'ring-1 ring-brand-500 bg-brand-500/20 text-brand-300'
                  : ''
              }`}
              title={crumb.name}
            >
              {idx === 0 ? (
                <Home size={13} className="shrink-0 text-zinc-400" />
              ) : (
                <Folder size={13} className="shrink-0 text-yellow-400/80" />
              )}
              <span className="truncate">{crumb.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
