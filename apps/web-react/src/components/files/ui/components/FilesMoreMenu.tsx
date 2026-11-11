import React, { useRef, useEffect } from 'react';
import {
  MoreVertical,
  LayoutGrid,
  List,
  Cloud,
  PanelRight,
  Filter,
  RefreshCw,
} from 'lucide-react';
import type { FileViewMode, FileSortColumn, FileSortOrder } from '../../hooks/useFilesExplorer';
import { playUiClickSound, playUiToggleSound } from '../../../../utils/uiSounds';

interface FilesMoreMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  viewMode: FileViewMode;
  onChangeViewMode: (mode: FileViewMode) => void;
  sortBy: FileSortColumn;
  sortOrder: FileSortOrder;
  onToggleSort: (column: FileSortColumn) => void;
  driveStatus: 'checking' | 'connected' | 'disconnected';
  onOpenDriveAuth: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  showCategoryFilter?: boolean;
  onToggleCategoryFilter?: () => void;
  onReload?: () => void;
}

const SORT_LABELS: Record<FileSortColumn, string> = {
  name: 'Nome',
  size: 'Tamanho',
  updated_at: 'Modificado',
  type: 'Tipo',
};

export const FilesMoreMenu: React.FC<FilesMoreMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  viewMode,
  onChangeViewMode,
  sortBy,
  sortOrder,
  onToggleSort,
  driveStatus,
  onOpenDriveAuth,
  isInspectorOpen,
  onToggleInspector,
  showCategoryFilter = true,
  onToggleCategoryFilter,
  onReload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          playUiClickSound();
          onToggle();
        }}
        className={`p-1.5 rounded-lg border transition-colors ${
          isOpen
            ? 'bg-white/[0.08] text-white border-white/[0.1]'
            : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border-white/[0.04]'
        }`}
        title="Mais opções"
        aria-label="Mais opções"
      >
        <MoreVertical size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* View Mode */}
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-zinc-400">Exibição</span>
            <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-md border border-white/[0.04]">
              <button
                type="button"
                onClick={() => {
                  playUiClickSound();
                  onChangeViewMode('grid');
                }}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Grade"
              >
                <LayoutGrid size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiClickSound();
                  onChangeViewMode('table');
                }}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Lista"
              >
                <List size={12} />
              </button>
            </div>
          </div>

          <div className="h-px bg-white/[0.06] my-1" />

          {/* Sort By */}
          <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Ordenar por
          </div>
          {(['name', 'size', 'updated_at', 'type'] as FileSortColumn[]).map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => {
                playUiClickSound();
                onToggleSort(col);
                onClose();
              }}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-white/[0.06] transition-colors ${
                sortBy === col ? 'text-brand-400 font-medium' : 'text-zinc-300'
              }`}
            >
              <span>{SORT_LABELS[col]}</span>
              {sortBy === col && (
                <span className="text-[10px] text-zinc-500 font-mono uppercase">
                  {sortOrder === 'asc' ? 'Cresc.' : 'Decresc.'}
                </span>
              )}
            </button>
          ))}

          <div className="h-px bg-white/[0.06] my-1" />

          {/* Google Drive Status & Connection */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDriveAuth();
            }}
            className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Cloud
                size={14}
                className={driveStatus === 'connected' ? 'text-emerald-400' : 'text-zinc-400'}
              />
              <span>Google Drive</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  driveStatus === 'connected'
                    ? 'bg-emerald-500'
                    : driveStatus === 'disconnected'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className={driveStatus === 'connected' ? 'text-emerald-400' : 'text-zinc-400'}>
                {driveStatus === 'connected' ? 'Conectado' : 'Conectar'}
              </span>
            </div>
          </button>

          {/* Inspector toggle */}
          <button
            type="button"
            onClick={() => {
              playUiToggleSound(!isInspectorOpen);
              onClose();
              onToggleInspector();
            }}
            className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <PanelRight
                size={14}
                className={isInspectorOpen ? 'text-brand-400' : 'text-zinc-400'}
              />
              <span>Painel de Detalhes</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">I</span>
          </button>

          {/* Category Filter Bar Toggle */}
          {onToggleCategoryFilter && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onToggleCategoryFilter();
              }}
              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Filter
                  size={14}
                  className={showCategoryFilter ? 'text-brand-400' : 'text-zinc-400'}
                />
                <span>Barra de Filtros</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {showCategoryFilter ? 'Visível' : 'Oculto'}
              </span>
            </button>
          )}

          {/* Reload action */}
          {onReload && (
            <>
              <div className="h-px bg-white/[0.06] my-1" />
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReload();
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
              >
                <RefreshCw size={14} className="text-zinc-400" />
                <span>Recarregar Arquivos</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
