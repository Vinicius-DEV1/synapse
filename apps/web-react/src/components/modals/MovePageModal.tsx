import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Check, LayoutGrid, FolderInput } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { isValidHierarchyMove, getPageBreadcrumbString } from '../../utils/hierarchy';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';
import { filterActivePages } from '../../utils/page-filter';

import { MovePageTreeNode, type TreeNode } from './move-page/MovePageTreeNode';
import { MovePageSearchResults } from './move-page/MovePageSearchResults';

interface MovePageModalProps {
  isOpen: boolean;
  pageId: string | null;
  onClose: () => void;
  onMovePage: (sourceId: string, targetParentId: string | null) => Promise<void>;
}

export default function MovePageModal({ isOpen, pageId, onClose, onMovePage }: MovePageModalProps) {
  const { state, dispatch } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null | 'UNSET'>('UNSET');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activePages = useMemo(() => filterActivePages(state.pages), [state.pages]);

  const sourcePage = useMemo(() => {
    return state.pages.find((p) => p.id === pageId) || null;
  }, [state.pages, pageId]);

  // Initialize selected target with current page parent
  useEffect(() => {
    if (isOpen && sourcePage) {
      setSelectedTargetId(sourcePage.parent_id);
      setSearchQuery('');
      // Auto-expand parent nodes in tree
      const parents = new Set<string>();
      let currentParentId = sourcePage.parent_id;
      while (currentParentId) {
        parents.add(currentParentId);
        const parent = activePages.find((p) => p.id === currentParentId);
        currentParentId = parent?.parent_id || null;
      }
      setExpandedNodes(parents);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, sourcePage, activePages]);

  // Helper to retrieve full breadcrumb path
  const getBreadcrumb = (targetId: string | null): string => {
    if (!targetId) return 'Raiz (Início)';
    return getPageBreadcrumbString(activePages, targetId, {
      includeSelf: true,
      separator: ' > ',
      rootLabel: 'Raiz (Início)',
    });
  };

  // Build complete hierarchical tree excluding soft-deleted pages
  const pageTree = useMemo(() => {
    const buildTree = (parentId: string | null, level: number = 0): TreeNode[] => {
      const children = activePages
        .filter((p) => p.parent_id === parentId)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      return children.map((page) => ({
        page,
        level,
        children: buildTree(page.id, level + 1),
      }));
    };

    return buildTree(null);
  }, [activePages]);

  // Filtered list during active search
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();

    return activePages
      .filter((p) => {
        const titleMatch = (p.title || 'Sem Título').toLowerCase().includes(query);
        const breadcrumbMatch = getBreadcrumb(p.id).toLowerCase().includes(query);
        return titleMatch || breadcrumbMatch;
      })
      .map((p) => ({
        page: p,
        breadcrumb: getBreadcrumb(p.id),
        isValid: sourcePage ? isValidHierarchyMove(activePages, sourcePage.id, p.id) : true,
      }));
  }, [searchQuery, activePages, sourcePage]);

  if (!isOpen || !sourcePage) return null;

  const currentParentId = sourcePage.parent_id;
  const effectiveSelectedId = selectedTargetId === 'UNSET' ? currentParentId : selectedTargetId;
  const isTargetSameAsCurrent = effectiveSelectedId === currentParentId;
  const isSelectedValid = effectiveSelectedId === null || (sourcePage ? isValidHierarchyMove(activePages, sourcePage.id, effectiveSelectedId) : true);

  const toggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleSelect = (targetId: string | null) => {
    if (targetId !== null && !isValidHierarchyMove(activePages, sourcePage.id, targetId)) {
      return;
    }
    setSelectedTargetId(targetId);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSelectedValid || isTargetSameAsCurrent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onMovePage(sourcePage.id, effectiveSelectedId);
      if (effectiveSelectedId) {
        dispatch({ type: 'EXPAND_NODE', nodeId: effectiveSelectedId });
      }
      const destName = effectiveSelectedId
        ? state.pages.find((p) => p.id === effectiveSelectedId)?.title || 'Página'
        : 'Raiz';
      triggerToast(`Página movida para "${destName}" com sucesso!`, 'success');
      onClose();
    } catch (err) {
      console.error('Erro ao mover página:', err);
      triggerToast('Erro ao mover a página. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      if (isSelectedValid && !isTargetSameAsCurrent) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div
          className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[82vh] animate-scale-in"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400">
                <FolderInput size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">
                  Mover &ldquo;{sourcePage.title || 'Sem Título'}&rdquo;
                </h2>
                <p className="text-xs text-dark-subtext truncate">
                  Local atual: <span className="text-white/70">{getBreadcrumb(sourcePage.parent_id)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-white/5 shrink-0 bg-white/[0.01]">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-dark-subtext pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar página de destino pelo nome ou caminho..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-dark-subtext focus:outline-none focus:border-brand-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-dark-subtext hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* List / Tree View */}
          <div className="p-3 overflow-y-auto flex-1 custom-scrollbar space-y-1">
            {/* Opção da Raiz (Aparece se não houver busca ou se busca casar com raiz) */}
            {(!searchQuery || 'raiz inicio principal'.includes(searchQuery.toLowerCase())) && (
              <div
                onClick={() => handleSelect(null)}
                onDoubleClick={() => currentParentId !== null && handleSubmit()}
                className={`flex items-center justify-between p-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                  effectiveSelectedId === null
                    ? 'bg-brand-500/20 text-brand-300 font-medium border border-brand-500/30'
                    : 'text-dark-text hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg ${
                      effectiveSelectedId === null
                        ? 'bg-brand-500/30 text-brand-400'
                        : 'bg-white/5 text-dark-subtext'
                    }`}
                  >
                    <LayoutGrid size={16} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Raiz</span>
                    <span className="text-xs text-dark-subtext">(Página Principal de 1º Nível)</span>
                    {currentParentId === null && (
                      <span className="text-[10px] bg-white/10 text-dark-subtext px-1.5 py-0.5 rounded font-normal">
                        Local Atual
                      </span>
                    )}
                  </div>
                </div>

                {effectiveSelectedId === null && <Check size={16} className="text-brand-400" />}
              </div>
            )}

            {searchQuery ? (
              <MovePageSearchResults
                filteredPages={filteredPages}
                searchQuery={searchQuery}
                effectiveSelectedId={effectiveSelectedId}
                currentParentId={currentParentId}
                onSelect={handleSelect}
                onSubmit={handleSubmit}
              />
            ) : (
              /* Full Hierarchical Tree */
              <div className="space-y-0.5 mt-1">
                {pageTree.map((node) => (
                  <MovePageTreeNode
                    key={node.page.id}
                    node={node}
                    allPages={activePages}
                    sourcePageId={sourcePage.id}
                    effectiveSelectedId={effectiveSelectedId}
                    currentParentId={currentParentId}
                    expandedNodes={expandedNodes}
                    onToggleExpand={toggleExpand}
                    onSelect={handleSelect}
                    onSubmit={handleSubmit}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-dark-subtext block">Novo Destino:</span>
              <span className="text-xs font-semibold text-white truncate block">
                {getBreadcrumb(effectiveSelectedId)}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || isTargetSameAsCurrent || !isSelectedValid}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-lg flex items-center gap-1.5"
              >
                <FolderInput size={14} />
                {isSubmitting ? 'Movendo...' : isTargetSameAsCurrent ? 'Local Atual' : 'Mover Aqui'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
