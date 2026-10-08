import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { BatteryTreeItem } from './BatteryTreeItem';
import { BatteryMoveModal } from './BatteryMoveModal';
import { BatteryDeleteModal } from './BatteryDeleteModal';
import { QuestionsExplorerFilters } from './QuestionsExplorerFilters';
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
      <QuestionsExplorerFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedOrigin={selectedOrigin}
        onSelectedOriginChange={setSelectedOrigin}
        selectedStatus={selectedStatus}
        onSelectedStatusChange={setSelectedStatus}
        selectedTag={selectedTag}
        onSelectedTagChange={setSelectedTag}
        allAvailableTags={allAvailableTags}
      />

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
      <BatteryDeleteModal
        battery={batteryPendingDelete}
        hasSubgroups={Boolean(batteryPendingDelete && batteries.some((b) => b.parent_id === batteryPendingDelete.id))}
        onClose={() => setBatteryPendingDelete(null)}
        onConfirmDelete={onDeleteBattery}
      />
    </div>
  );
});
