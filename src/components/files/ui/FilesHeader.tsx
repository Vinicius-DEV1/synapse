import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  FolderUp,
  Plus,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  LayoutGrid,
  List,
  ArrowUpDown,
  PanelRight,
  X,
  FolderPlus,
} from 'lucide-react';
import type { FileViewMode, FileSortColumn, FileSortOrder, FileSearchScope } from '../hooks/useFilesExplorer';
import { FilesBreadcrumbs } from './FilesBreadcrumbs';
import type { BreadcrumbItem } from '../utils/filesHierarchy';

interface FilesHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onNavigateBreadcrumb: (folderId: string | null) => void;
  onDropOnFolder: (targetFolderId: string | null, payload?: { id: string; isFolder: boolean } | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchScope?: FileSearchScope;
  onToggleSearchScope?: () => void;
  viewMode: FileViewMode;
  onChangeViewMode: (mode: FileViewMode) => void;
  sortBy: FileSortColumn;
  sortOrder: FileSortOrder;
  onToggleSort: (column: FileSortColumn) => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  driveStatus: 'checking' | 'connected' | 'disconnected';
  onOpenDriveAuth: () => void;
  onOpenFolderUpload: () => void;
  onOpenFileUpload: () => void;
  onNewFolder: () => void;
}

const SORT_LABELS: Record<FileSortColumn, string> = {
  name: 'Nome',
  size: 'Tamanho',
  updated_at: 'Modificado',
  type: 'Tipo',
};

export const FilesHeader: React.FC<FilesHeaderProps> = ({
  breadcrumbs,
  canGoBack,
  canGoForward,
  canGoUp,
  onGoBack,
  onGoForward,
  onGoUp,
  onNavigateBreadcrumb,
  onDropOnFolder,
  searchQuery,
  onSearchChange,
  searchScope = 'current',
  onToggleSearchScope,
  viewMode,
  onChangeViewMode,
  sortBy,
  sortOrder,
  onToggleSort,
  isInspectorOpen,
  onToggleInspector,
  driveStatus,
  onOpenDriveAuth,
  onOpenFolderUpload,
  onOpenFileUpload,
  onNewFolder,
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu]);

  return (
    <header className="border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-md flex flex-col select-none">
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 min-w-0 flex-wrap sm:flex-nowrap">
        {/* Left: Navigation Buttons & Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-0.5 shrink-0 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.04]">
            <button
              type="button"
              onClick={onGoBack}
              disabled={!canGoBack}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
              title="Voltar (Alt + Esquerda)"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              onClick={onGoForward}
              disabled={!canGoForward}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
              title="Avançar (Alt + Direita)"
            >
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onGoUp}
              disabled={!canGoUp}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
              title="Subir um nível (Alt + Cima)"
            >
              <ArrowUp size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/[0.06] shrink-0" />

          {/* Breadcrumbs */}
          <FilesBreadcrumbs
            breadcrumbs={breadcrumbs}
            onNavigate={onNavigateBreadcrumb}
            onDropOnFolder={onDropOnFolder}
          />
        </div>

        {/* Right: Search, View Controls & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Input & Scope Toggle */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-40 sm:w-52">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Buscar arquivos... (Ctrl+F)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-7 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.05] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  title="Limpar busca"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {onToggleSearchScope && searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={onToggleSearchScope}
                className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all flex items-center gap-1 ${
                  searchScope === 'all'
                    ? 'bg-brand-500/15 border-brand-500/30 text-brand-300 hover:bg-brand-500/25 shadow-sm'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                }`}
                title={
                  searchScope === 'all'
                    ? 'Buscando em todo o Caderno. Clique para buscar apenas nesta pasta.'
                    : 'Buscando apenas nesta pasta. Clique para buscar em todo o Caderno.'
                }
              >
                <span>{searchScope === 'all' ? 'Tudo' : 'Esta Pasta'}</span>
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.04]">
            <button
              type="button"
              onClick={() => onChangeViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('table')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em Lista / Tabela"
            >
              <List size={13} />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-white/[0.04] text-xs transition-colors"
              title="Ordenar arquivos"
            >
              <ArrowUpDown size={12} className="text-zinc-400" />
              <span className="hidden md:inline">{SORT_LABELS[sortBy]}</span>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Ordenar por
                </div>
                {(['name', 'size', 'updated_at', 'type'] as FileSortColumn[]).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      onToggleSort(col);
                      setShowSortMenu(false);
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
              </div>
            )}
          </div>

          {/* Inspector Toggle Button */}
          <button
            type="button"
            onClick={onToggleInspector}
            className={`p-1.5 rounded-lg border transition-colors ${
              isInspectorOpen
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border-white/[0.04]'
            }`}
            title="Alternar Painel de Detalhes (I)"
          >
            <PanelRight size={14} />
          </button>

          <div className="h-4 w-px bg-white/[0.06]" />

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenDriveAuth}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
              title="Status do Google Drive"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  driveStatus === 'connected'
                    ? 'bg-emerald-500'
                    : driveStatus === 'disconnected'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px]">
                {driveStatus === 'connected' ? 'Drive' : 'Conectar'}
              </span>
            </button>

            <button
              type="button"
              onClick={onNewFolder}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] rounded-lg text-xs font-medium transition-colors"
              title="Criar nova pasta"
            >
              <FolderPlus size={13} />
              <span className="hidden sm:inline">Nova Pasta</span>
            </button>

            <button
              type="button"
              onClick={onOpenFolderUpload}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/25 rounded-lg text-xs font-medium transition-colors"
              title="Importar pasta completa"
            >
              <FolderUp size={13} />
            </button>

            <button
              type="button"
              onClick={onOpenFileUpload}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm shadow-brand-500/20 active:scale-95"
              title="Adicionar arquivos"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
