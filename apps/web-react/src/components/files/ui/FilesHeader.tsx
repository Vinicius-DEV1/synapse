import React, { useState } from 'react';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import type { FileViewMode, FileSortColumn, FileSortOrder, FileSearchScope } from '../hooks/useFilesExplorer';
import { FilesBreadcrumbs } from './FilesBreadcrumbs';
import type { BreadcrumbItem } from '../utils/filesHierarchy';
import { playUiClickSound, playUiToggleSound } from '../../../utils/uiSounds';
import { FilesAddMenu } from './components/FilesAddMenu';
import { FilesMoreMenu } from './components/FilesMoreMenu';

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

  return (
    <header className="relative z-30 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-md flex flex-col select-none">
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
          <FilesAddMenu
            isOpen={showAddMenu}
            onToggle={() => setShowAddMenu((prev) => !prev)}
            onClose={() => setShowAddMenu(false)}
            onOpenFileUpload={onOpenFileUpload}
            onOpenFolderUpload={onOpenFolderUpload}
            onNewFolder={onNewFolder}
          />

          {/* Secondary Options Menu ("...") */}
          <FilesMoreMenu
            isOpen={showMoreMenu}
            onToggle={() => setShowMoreMenu((prev) => !prev)}
            onClose={() => setShowMoreMenu(false)}
            viewMode={viewMode}
            onChangeViewMode={onChangeViewMode}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSort={onToggleSort}
            driveStatus={driveStatus}
            onOpenDriveAuth={onOpenDriveAuth}
            isInspectorOpen={isInspectorOpen}
            onToggleInspector={onToggleInspector}
            showCategoryFilter={showCategoryFilter}
            onToggleCategoryFilter={onToggleCategoryFilter}
            onReload={onReload}
          />
        </div>
      </div>
    </header>
  );
};
