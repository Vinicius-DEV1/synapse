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
  PanelRight,
  X,
  FolderPlus,
  ChevronDown,
  MoreVertical,
  Cloud,
  Upload,
  Filter,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import type { FileViewMode, FileSortColumn, FileSortOrder, FileSearchScope } from '../hooks/useFilesExplorer';
import { FilesBreadcrumbs } from './FilesBreadcrumbs';
import type { BreadcrumbItem } from '../utils/filesHierarchy';
import { playUiClickSound, playUiToggleSound, playUiActionSound } from '../../../utils/uiSounds';

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
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
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
  isSidebarOpen = true,
  onToggleSidebar,
  showCategoryFilter = true,
  onToggleCategoryFilter,
  onReload,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addMenuRef.current && !addMenuRef.current.contains(target)) {
        setShowAddMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
    };

    if (showAddMenu || showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddMenu, showMoreMenu]);

  return (
    <header className="border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-md flex flex-col select-none">
      {/* Top Toolbar */}
      <div className="px-3.5 py-2 flex items-center justify-between gap-3 min-w-0 flex-wrap sm:flex-nowrap">
        {/* Left: Sidebar Toggle, Navigation Buttons & Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={() => {
                onToggleSidebar();
                playUiToggleSound(!isSidebarOpen);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
              title={isSidebarOpen ? 'Ocultar barra de pastas' : 'Exibir barra de pastas'}
              aria-label={isSidebarOpen ? 'Ocultar barra de pastas' : 'Exibir barra de pastas'}
            >
              {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            </button>
          )}

          <div className="flex items-center gap-0.5 shrink-0 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.04]">
            <button
              type="button"
              onClick={() => {
                playUiClickSound();
                onGoBack();
              }}
              disabled={!canGoBack}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
              title="Voltar (Alt + Esquerda)"
            >
              <ArrowLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClickSound();
                onGoForward();
              }}
              disabled={!canGoForward}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
              title="Avançar (Alt + Direita)"
            >
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClickSound();
                onGoUp();
              }}
              disabled={!canGoUp}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
              title="Subir um nível (Alt + Cima)"
            >
              <ArrowUp size={13} />
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

        {/* Right: Search, View Mode, Sort, Add Dropdown & Options Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Input & Scope Toggle */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-36 sm:w-48 lg:w-56">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Buscar... (Ctrl+F)"
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
                onClick={() => {
                  playUiClickSound();
                  onToggleSearchScope();
                }}
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

          <div className="h-4 w-px bg-white/[0.06]" />

          {/* Unified "+ Adicionar" Action Dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => {
                playUiClickSound();
                setShowAddMenu(!showAddMenu);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-all shadow-sm shadow-brand-500/20 active:scale-95"
              title="Adicionar arquivos ou pastas"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Adicionar</span>
              <ChevronDown
                size={11}
                className={`transition-transform duration-150 ${showAddMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    playUiClickSound();
                    setShowAddMenu(false);
                    onOpenFileUpload();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
                >
                  <Upload size={14} className="text-brand-400 shrink-0" />
                  <span>Adicionar Arquivo(s)...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playUiClickSound();
                    setShowAddMenu(false);
                    onOpenFolderUpload();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
                >
                  <FolderUp size={14} className="text-emerald-400 shrink-0" />
                  <span>Enviar Pasta Completa</span>
                </button>

                <div className="h-px bg-white/[0.06] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    playUiActionSound();
                    setShowAddMenu(false);
                    onNewFolder();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors"
                >
                  <FolderPlus size={14} className="text-yellow-400 shrink-0" />
                  <span>Criar Nova Pasta</span>
                </button>
              </div>
            )}
          </div>

          {/* Secondary Options Menu ("...") */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => {
                playUiClickSound();
                setShowMoreMenu(!showMoreMenu);
              }}
              className={`p-1.5 rounded-lg border transition-colors ${
                showMoreMenu
                  ? 'bg-white/[0.08] text-white border-white/[0.1]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border-white/[0.04]'
              }`}
              title="Mais opções"
              aria-label="Mais opções"
            >
              <MoreVertical size={14} />
            </button>

            {showMoreMenu && (
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
                      setShowMoreMenu(false);
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
                    setShowMoreMenu(false);
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
                    setShowMoreMenu(false);
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
                      setShowMoreMenu(false);
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
                        setShowMoreMenu(false);
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
        </div>
      </div>
    </header>
  );
};
