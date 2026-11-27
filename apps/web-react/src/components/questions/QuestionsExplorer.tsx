import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { BatteryTreeItem } from './BatteryTreeItem';
import { BatteryDetailModal } from './BatteryDetailModal';
import { BatteryMoveModal } from './BatteryMoveModal';
import { BatteryDeleteModal } from './BatteryDeleteModal';
import { QuestionsExplorerFilters } from './QuestionsExplorerFilters';
import {
  buildBatteryHierarchy,
  filterBatteryHierarchy,
  getBatteryBreadcrumb,
} from '../../services/quiz/quizHierarchy';
import type { BatteryTreeNode, BatteryWithQuestions } from '../../types/quiz';
import { useI18n } from '../../i18n';

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

const INITIAL_ROOT_BATTERIES_LIMIT = 30;
const ROOT_BATTERIES_PAGE_STEP = 30;

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
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<'all' | 'linked' | 'standalone'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'errors'>('all');
  const [inspectedRootId, setInspectedRootId] = useState<string | null>(null);
  const [batteryPendingDelete, setBatteryPendingDelete] = useState<BatteryWithQuestions | null>(null);
  const [batteryToMove, setBatteryToMove] = useState<BatteryWithQuestions | null>(null);
  const [visibleRootLimit, setVisibleRootLimit] = useState(INITIAL_ROOT_BATTERIES_LIMIT);

  // O(1) lookup map for instant action resolution without O(N) array scans per item
  const batteryByIdMap = useMemo(() => {
    const map = new Map<string, BatteryWithQuestions>();
    for (let i = 0; i < batteries.length; i++) {
      map.set(batteries[i].id, batteries[i]);
    }
    return map;
  }, [batteries]);

  // Open detail modal or scroll to highlighted battery from Caderno
  useEffect(() => {
    if (highlightedBatteryId) {
      const breadcrumb = getBatteryBreadcrumb(highlightedBatteryId, batteries);
      const rootId = breadcrumb[0]?.id || highlightedBatteryId;
      setVisibleRootLimit((prev) => Math.max(prev, batteries.length));
      setInspectedRootId(rootId);
      const timer = setTimeout(() => {
        const el = document.getElementById(`battery-card-${rootId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedBatteryId, batteries]);

  const handleInspectBattery = useCallback((node: BatteryTreeNode) => {
    setInspectedRootId(node.id);
  }, []);

  const handlePlay = useCallback(
    (node: BatteryWithQuestions) => {
      const original = batteryByIdMap.get(node.id) || node;
      onPlayBattery(original);
    },
    [batteryByIdMap, onPlayBattery]
  );

  const handleEdit = useCallback(
    (node: BatteryWithQuestions) => {
      const original = batteryByIdMap.get(node.id) || node;
      onEditBattery(original);
    },
    [batteryByIdMap, onEditBattery]
  );

  const handleRequestDelete = useCallback(
    (id: string) => {
      const b = batteryByIdMap.get(id);
      if (b) setBatteryPendingDelete(b);
    },
    [batteryByIdMap]
  );

  const handleOpenMoveModal = useCallback((b: BatteryWithQuestions) => {
    setBatteryToMove(b);
  }, []);

  // Build hierarchical tree
  const batteryTree = useMemo(() => buildBatteryHierarchy(batteries), [batteries]);

  // Filter hierarchy preserving parent/child relations
  const { filteredTree } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const isFiltering = Boolean(term || selectedOrigin !== 'all' || selectedTag || selectedStatus !== 'all');

    if (!isFiltering) {
      return { filteredTree: batteryTree };
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

  const inspectedNode = useMemo(() => {
    if (!inspectedRootId) return null;
    return filteredTree.find((n) => n.id === inspectedRootId) || batteryTree.find((n) => n.id === inspectedRootId) || null;
  }, [inspectedRootId, filteredTree, batteryTree]);

  const visibleRoots = useMemo(
    () =>
      filteredTree.length > visibleRootLimit
        ? filteredTree.slice(0, visibleRootLimit)
        : filteredTree,
    [filteredTree, visibleRootLimit]
  );
  const remainingRootsCount = filteredTree.length - visibleRoots.length;

  return (
    <div className="space-y-4 animate-fade-in">
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

      {/* Clean, lightweight Batteries List */}
      <div className="space-y-2.5">
        {filteredTree.length === 0 ? (
          <div className="bg-dark-card/30 border border-dashed border-white/5 rounded-2xl p-10 text-center space-y-2">
            <HelpCircle size={24} className="mx-auto text-zinc-500" />
            <h4 className="text-sm font-medium text-zinc-300">{t('questions.explorer.emptyTitle')}</h4>
            <p className="text-xs text-zinc-500">
              {t('questions.explorer.emptyDesc')}
            </p>
          </div>
        ) : (
          <>
            {visibleRoots.map((rootNode) => (
              <BatteryTreeItem
                key={rootNode.id}
                node={rootNode}
                onInspectBattery={handleInspectBattery}
                onPlayBattery={handlePlay}
                onEditBattery={handleEdit}
                onDeleteBattery={handleRequestDelete}
                onNavigateToPage={onNavigateToPage}
                onCreateSubgroup={onCreateSubgroup}
                onOpenMoveModal={handleOpenMoveModal}
                getPageTitle={getPageTitle}
                highlightedBatteryId={highlightedBatteryId}
              />
            ))}

            {remainingRootsCount > 0 && (
              <button
                type="button"
                onClick={() => setVisibleRootLimit((prev) => prev + ROOT_BATTERIES_PAGE_STEP)}
                className="w-full py-2.5 rounded-xl bg-dark-card/50 hover:bg-dark-card border border-white/[0.06] hover:border-brand-500/30 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Carregar mais {Math.min(remainingRootsCount, ROOT_BATTERIES_PAGE_STEP)} de {remainingRootsCount} baterias
              </button>
            )}
          </>
        )}
      </div>

      {/* On-demand Clean Battery Detail & Questions Modal */}
      <BatteryDetailModal
        rootNode={inspectedNode}
        onClose={() => setInspectedRootId(null)}
        onPlayBattery={handlePlay}
        onEditBattery={handleEdit}
        onDeleteBattery={handleRequestDelete}
        onNavigateToPage={onNavigateToPage}
        onCreateSubgroup={onCreateSubgroup}
        onOpenMoveModal={handleOpenMoveModal}
        getPageTitle={getPageTitle}
      />

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
