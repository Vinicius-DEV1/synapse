import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  FileText,
  Folder,
  FolderInput,
  Play,
  Plus,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { BatteryQuestionsPreview } from './BatteryQuestionsPreview';
import type { BatteryTreeNode, BatteryWithQuestions } from '../../types/quiz';
import { useI18n } from '../../i18n';

interface BatteryDetailModalProps {
  rootNode: BatteryTreeNode | null;
  onClose: () => void;
  onPlayBattery: (battery: BatteryWithQuestions) => void;
  onEditBattery: (battery: BatteryWithQuestions) => void;
  onDeleteBattery: (batteryId: string) => void;
  onNavigateToPage: (pageId: string) => void;
  onCreateSubgroup?: (parentBatteryId: string) => void;
  onOpenMoveModal?: (battery: BatteryWithQuestions) => void;
  getPageTitle?: (pageId: string) => string | null;
}

function findNodeInSubtree(root: BatteryTreeNode, targetId: string): BatteryTreeNode | null {
  if (root.id === targetId) return root;
  for (let i = 0; i < root.children.length; i++) {
    const found = findNodeInSubtree(root.children[i], targetId);
    if (found) return found;
  }
  return null;
}

export const BatteryDetailModal = React.memo(function BatteryDetailModal({
  rootNode,
  onClose,
  onPlayBattery,
  onEditBattery,
  onDeleteBattery,
  onNavigateToPage,
  onCreateSubgroup,
  onOpenMoveModal,
  getPageTitle,
}: BatteryDetailModalProps) {
  const { t } = useI18n();
  const [trailIds, setTrailIds] = useState<string[]>([]);

  useEffect(() => {
    setTrailIds(rootNode ? [rootNode.id] : []);
  }, [rootNode?.id]);

  useEffect(() => {
    if (!rootNode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rootNode, onClose]);

  const { activeNode, breadcrumbs } = useMemo(() => {
    if (!rootNode) return { activeNode: null, breadcrumbs: [] as BatteryTreeNode[] };
    const crumbs: BatteryTreeNode[] = [rootNode];
    let current = rootNode;
    for (let i = 1; i < trailIds.length; i++) {
      const next = findNodeInSubtree(current, trailIds[i]);
      if (!next) break;
      crumbs.push(next);
      current = next;
    }
    return { activeNode: current, breadcrumbs: crumbs };
  }, [rootNode, trailIds]);

  if (!rootNode || !activeNode) return null;

  const hasChildren = activeNode.children.length > 0;
  const totalQuestions = hasChildren ? activeNode.totalDescendantQuestionsCount : activeNode.questions.length;
  let answeredCount = 0;
  let correctCount = 0;

  if (hasChildren) {
    answeredCount = activeNode.totalDescendantAnsweredCount;
    correctCount = activeNode.totalDescendantCorrectCount;
  } else if (activeNode.latestAttempts) {
    const attempts = activeNode.latestAttempts;
    for (let i = 0; i < activeNode.questions.length; i++) {
      const att = attempts[activeNode.questions[i].id];
      if (att) {
        answeredCount++;
        if (att.is_correct) correctCount++;
      }
    }
  }

  const accuracy = hasChildren
    ? activeNode.aggregateAccuracyRate
    : answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={activeNode.title}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-dark-card border border-white/[0.08] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            {breadcrumbs.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-dark-subtext mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTrailIds((prev) => prev.slice(0, -1))}
                  className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Voltar</span>
                </button>
                <span className="text-white/20">•</span>
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight size={12} className="text-white/25" />}
                    <button
                      type="button"
                      onClick={() => setTrailIds((prev) => prev.slice(0, idx + 1))}
                      className={`truncate max-w-[180px] transition-colors cursor-pointer ${
                        idx === breadcrumbs.length - 1
                          ? 'text-dark-text font-medium'
                          : 'text-dark-subtext hover:text-dark-text'
                      }`}
                    >
                      {crumb.title}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-dark-text truncate">{activeNode.title}</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-dark-subtext">
                {totalQuestions} {totalQuestions === 1 ? t('questions.explorer.question') : t('questions.explorer.questions')}
              </span>
              {totalQuestions > 0 && (
                <span className="text-[11px] font-mono text-dark-subtext">
                  {answeredCount}/{totalQuestions} {t('questions.explorer.answered')}
                  {answeredCount > 0 && (
                    <span className={`ml-2 ${accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      • {accuracy}% {t('questions.explorer.accuracy')}
                    </span>
                  )}
                </span>
              )}
            </div>

            {activeNode.description && (
              <p className="text-xs text-dark-subtext mt-1">{activeNode.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {activeNode.linkedPages && activeNode.linkedPages.length > 0 ? (
                activeNode.linkedPages.map((p) => {
                  const pageTitle = getPageTitle?.(p.id) || p.title || 'Caderno';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToPage(p.id);
                      }}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <FileText size={11} />
                      <span className="truncate max-w-xs">{pageTitle}</span>
                      <ExternalLink size={10} className="opacity-70" />
                    </button>
                  );
                })
              ) : activeNode.page_id ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToPage(activeNode.page_id!);
                  }}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileText size={11} />
                  <span className="truncate max-w-xs">{getPageTitle?.(activeNode.page_id) || 'Caderno'}</span>
                  <ExternalLink size={10} className="opacity-70" />
                </button>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-dark-subtext flex items-center gap-1">
                  <Zap size={10} className="text-amber-400" />
                  <span>{t('questions.explorer.standaloneBattery')}</span>
                </span>
              )}

              {(activeNode.tags || []).slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-dark-subtext"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-dark-surface/60 border-b border-white/[0.05] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onPlayBattery(activeNode);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Play size={13} className="fill-white" />
              <span>{hasChildren ? t('questions.explorer.practiceAll') : t('questions.explorer.practice')}</span>
            </button>

            {onCreateSubgroup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateSubgroup(activeNode.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-dark-text border border-white/10 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={13} className="text-brand-400" />
                <span>{t('questions.explorer.addSubgroup')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditBattery(activeNode);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 size={13} />
              <span>{t('questions.explorer.editBattery')}</span>
            </button>

            {onOpenMoveModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMoveModal(activeNode);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderInput size={13} />
                <span>{t('questions.explorer.moveBattery')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteBattery(activeNode.id);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t('questions.explorer.moveToTrash')}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body: Subgroups + On-demand Paginated Questions */}
        <div className="flex-1 overflow-y-auto smooth-scroll-container custom-scrollbar p-5 space-y-4">
          {hasChildren && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-dark-subtext">
                {t('questions.explorer.subgroups')} ({activeNode.children.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeNode.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setTrailIds((prev) => [...prev, child.id])}
                    className="p-3 rounded-xl bg-dark-surface hover:bg-white/[0.04] border border-white/5 hover:border-brand-500/30 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder size={15} className="text-brand-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-dark-text truncate">{child.title}</p>
                        <p className="text-[11px] font-mono text-dark-subtext">
                          {child.children.length > 0 ? child.totalDescendantQuestionsCount : child.questions.length}{' '}
                          {t('questions.explorer.questions')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-dark-subtext shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeNode.questions.length > 0 ? (
            <BatteryQuestionsPreview key={activeNode.id} node={activeNode} />
          ) : (
            !hasChildren && (
              <div className="py-10 text-center text-xs text-dark-subtext">
                Nenhuma questão nesta bateria ainda.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
});
