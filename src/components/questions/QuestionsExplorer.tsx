import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Tag, FileText, HelpCircle, Zap, Trash2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { BatteryTreeItem } from './BatteryTreeItem';
import { BatteryMoveModal } from './BatteryMoveModal';
import {
  buildBatteryHierarchy,
  filterBatteryHierarchy,
  getBatteryBreadcrumb,
} from '../../services/quiz/quizHierarchy';
import type { BatteryWithQuestions } from '../../types/quiz';

interface QuestionsExplorerProps {
  batteries: BatteryWithQuestions[];
  onPlayBattery: (battery: BatteryWithQuestions) => void;
  onEditBattery: (battery: BatteryWithQuestions) => void;
  onDeleteBattery: (batteryId: string) => void;
  onNavigateToPage: (pageId: string) => void;
  allAvailableTags: string[];
  getPageTitle?: (pageId: string) => string | null;
  highlightedBatteryId?: string;
  onCreateSubgroup?: (parentBatteryId: string) => void;
  onMoveBattery?: (batteryId: string, newParentId: string | null) => Promise<void>;
}

export const QuestionsExplorer = React.memo(function QuestionsExplorer({
  batteries,
  onPlayBattery,
  onEditBattery,
  onDeleteBattery,
  onNavigateToPage,
  allAvailableTags,
  getPageTitle,
  highlightedBatteryId,
  onCreateSubgroup,
  onMoveBattery,
}: QuestionsExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<'all' | 'linked' | 'standalone'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'errors'>('all');
  const [expandedBatteryIds, setExpandedBatteryIds] = useState<Set<string>>(new Set());
  const [batteryPendingDelete, setBatteryPendingDelete] = useState<BatteryWithQuestions | null>(null);
  const [batteryToMove, setBatteryToMove] = useState<BatteryWithQuestions | null>(null);

  // Tecla Esc para fechar o modal de exclusão
  useEffect(() => {
    if (!batteryPendingDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setBatteryPendingDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batteryPendingDelete]);

  // Expand highlighted battery and its ancestors
  useEffect(() => {
    if (highlightedBatteryId) {
      const breadcrumb = getBatteryBreadcrumb(highlightedBatteryId, batteries);
      const ancestorIds = breadcrumb.map((b) => b.id);
      setExpandedBatteryIds((prev) => new Set([...prev, ...ancestorIds, highlightedBatteryId]));
      const timer = setTimeout(() => {
        const el = document.getElementById(`battery-card-${highlightedBatteryId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedBatteryId, batteries]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedBatteryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePlay = useCallback(
    (node: BatteryWithQuestions) => {
      const original = batteries.find((b) => b.id === node.id) || node;
      onPlayBattery(original);
    },
    [batteries, onPlayBattery]
  );

  const handleEdit = useCallback(
    (node: BatteryWithQuestions) => {
      const original = batteries.find((b) => b.id === node.id) || node;
      onEditBattery(original);
    },
    [batteries, onEditBattery]
  );

  // Build hierarchical tree
  const batteryTree = useMemo(() => buildBatteryHierarchy(batteries), [batteries]);

  // Filter hierarchy preserving parent/child relations
  const { filteredTree, autoExpandedIds } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const isFiltering = Boolean(term || selectedOrigin !== 'all' || selectedTag || selectedStatus !== 'all');

    if (!isFiltering) {
      return { filteredTree: batteryTree, autoExpandedIds: new Set<string>() };
    }

    return filterBatteryHierarchy(batteryTree, (b) => {
      // 1. Origin filter
      const isLinked = Boolean(b.page_id || (b.linkedPages && b.linkedPages.length > 0));
      if (selectedOrigin === 'linked' && !isLinked) return false;
      if (selectedOrigin === 'standalone' && isLinked) return false;

      // 2. Tag filter
      if (selectedTag) {
        const normSelectedTag = selectedTag.toLowerCase();
        const hasTag =
          (b.tags || []).some((t) => typeof t === 'string' && t.toLowerCase() === normSelectedTag) ||
          b.questions.some((q) =>
            (q.tags || []).some((t) => typeof t === 'string' && t.toLowerCase() === normSelectedTag)
          );
        if (!hasTag) return false;
      }

      // 3. Status filter
      if (selectedStatus === 'pending') {
        const hasPending = b.questions.some((q) => !b.latestAttempts?.[q.id]);
        if (!hasPending) return false;
      } else if (selectedStatus === 'errors') {
        const hasErrors = b.questions.some((q) => b.latestAttempts?.[q.id] && !b.latestAttempts[q.id].is_correct);
        if (!hasErrors) return false;
      }

      // 4. Search query
      if (term) {
        const matchesTitle = (b.title || '').toLowerCase().includes(term);
        const matchesDesc = (b.description || '').toLowerCase().includes(term);
        const matchesTag = (b.tags || []).some((t) => typeof t === 'string' && t.toLowerCase().includes(term));
        const matchesQuestions = b.questions.some(
          (q) =>
            (q.question || '').toLowerCase().includes(term) ||
            (q.explanation || '').toLowerCase().includes(term) ||
            (q.tags || []).some((t) => typeof t === 'string' && t.toLowerCase().includes(term))
        );
        const matchesOriginPage =
          Boolean(b.page_id && getPageTitle?.(b.page_id)?.toLowerCase().includes(term)) ||
          Boolean(b.linkedPages && b.linkedPages.some((p) => (getPageTitle?.(p.id) || p.title || '').toLowerCase().includes(term)));

        if (!matchesTitle && !matchesDesc && !matchesTag && !matchesQuestions && !matchesOriginPage) return false;
      }

      return true;
    });
  }, [batteryTree, searchTerm, selectedOrigin, selectedTag, selectedStatus, getPageTitle]);

  const effectiveExpandedIds = useMemo(() => {
    if (autoExpandedIds.size === 0) return expandedBatteryIds;
    return new Set([...expandedBatteryIds, ...autoExpandedIds]);
  }, [expandedBatteryIds, autoExpandedIds]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Search and Filters Bar */}
      <div className="bg-dark-card/50 border border-white/5 rounded-2xl p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, enunciado, tag ou comentário..."
            className="w-full pl-10 pr-4 py-2 bg-dark-bg/60 border border-white/5 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Origin Filter */}
          <div className="flex items-center gap-1 bg-dark-bg/50 p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setSelectedOrigin('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedOrigin === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedOrigin('linked')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                selectedOrigin === 'linked' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText size={12} />
              <span>Do Caderno</span>
            </button>
            <button
              onClick={() => setSelectedOrigin('standalone')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                selectedOrigin === 'standalone' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap size={12} />
              <span>Avulsas</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-dark-bg/50 p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedStatus === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Qualquer Status
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedStatus === 'pending' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setSelectedStatus('errors')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-rose-300 ${
                selectedStatus === 'errors' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium' : 'hover:text-rose-200'
              }`}
            >
              Com Erros
            </button>
          </div>
        </div>

        {/* Tag Pills */}
        {allAvailableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
            <span className="text-[11px] text-zinc-500 mr-1 flex items-center gap-1">
              <Tag size={12} />
              <span>Tags:</span>
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 cursor-pointer transition-colors"
              >
                Limpar ({selectedTag}) ✕
              </button>
            )}
            {allAvailableTags.slice(0, 10).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedTag === t
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Batteries List (Tree View) */}
      <div className="space-y-3">
        {filteredTree.length === 0 ? (
          <div className="bg-dark-card/30 border border-dashed border-white/5 rounded-2xl p-10 text-center space-y-2">
            <HelpCircle size={24} className="mx-auto text-zinc-500" />
            <h4 className="text-sm font-medium text-zinc-300">Nenhuma bateria de questões encontrada</h4>
            <p className="text-xs text-zinc-500">
              Tente ajustar os filtros de busca ou crie uma nova bateria de exercícios.
            </p>
          </div>
        ) : (
          filteredTree.map((rootNode) => (
            <BatteryTreeItem
              key={rootNode.id}
              node={rootNode}
              depth={0}
              onPlayBattery={handlePlay}
              onEditBattery={handleEdit}
              onDeleteBattery={(id) => {
                const b = batteries.find((item) => item.id === id);
                if (b) setBatteryPendingDelete(b);
              }}
              onNavigateToPage={onNavigateToPage}
              onCreateSubgroup={onCreateSubgroup}
              onOpenMoveModal={(b) => setBatteryToMove(b)}
              getPageTitle={getPageTitle}
              highlightedBatteryId={highlightedBatteryId}
              expandedBatteryIds={effectiveExpandedIds}
              onToggleExpand={toggleExpand}
            />
          ))
        )}
      </div>

      {/* Move Battery to Group Modal */}
      {batteryToMove && onMoveBattery && (
        <BatteryMoveModal
          isOpen={Boolean(batteryToMove)}
          onClose={() => setBatteryToMove(null)}
          battery={batteryToMove}
          allBatteries={batteries}
          onConfirmMove={onMoveBattery}
        />
      )}

      {/* Delete Confirmation Modal */}
      {batteryPendingDelete && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4"
            onClick={() => setBatteryPendingDelete(null)}
          >
            <div
              className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-400 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Excluir Bateria</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Deseja realmente mover a bateria <strong className="text-zinc-200">"{batteryPendingDelete.title || 'Sem título'}"</strong> ({batteryPendingDelete.questions.length} questões) para a lixeira?
                  </p>
                  {batteries.some((b) => b.parent_id === batteryPendingDelete.id) && (
                    <p className="text-[11px] text-zinc-400 mt-2 bg-white/5 p-2 rounded-lg border border-white/5">
                      ℹ️ Os subgrupos desta bateria não serão excluídos; eles serão mantidos e movidos para o nível principal.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => setBatteryPendingDelete(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = batteryPendingDelete.id;
                    setBatteryPendingDelete(null);
                    onDeleteBattery(id);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-sm"
                >
                  Excluir Bateria
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
});
