import React from 'react';
import {
  Folder,
  Plus,
  Play,
  Edit3,
  Trash2,
  FileText,
  ExternalLink,
  Zap,
  FolderInput,
  ChevronRight,
} from 'lucide-react';
import type { BatteryTreeNode, BatteryWithQuestions } from '../../types/quiz';
import { useI18n } from '../../i18n';

interface BatteryTreeItemProps {
  node: BatteryTreeNode;
  onInspectBattery: (node: BatteryTreeNode) => void;
  onPlayBattery: (battery: BatteryWithQuestions) => void;
  onEditBattery: (battery: BatteryWithQuestions) => void;
  onDeleteBattery: (batteryId: string) => void;
  onNavigateToPage: (pageId: string) => void;
  onCreateSubgroup?: (parentBatteryId: string) => void;
  onOpenMoveModal?: (battery: BatteryWithQuestions) => void;
  getPageTitle?: (pageId: string) => string | null;
  highlightedBatteryId?: string;
}

export const BatteryTreeItem = React.memo(function BatteryTreeItem({
  node,
  onInspectBattery,
  onPlayBattery,
  onEditBattery,
  onDeleteBattery,
  onNavigateToPage,
  onCreateSubgroup,
  onOpenMoveModal,
  getPageTitle,
  highlightedBatteryId,
}: BatteryTreeItemProps) {
  const { t } = useI18n();
  const hasChildren = node.children.length > 0;
  const isHighlighted = node.id === highlightedBatteryId;

  // Stats calculation: single-pass without array allocations
  const totalQuestions = hasChildren ? node.totalDescendantQuestionsCount : node.questions.length;
  let answeredCount = 0;
  let correctCount = 0;

  if (hasChildren) {
    answeredCount = node.totalDescendantAnsweredCount;
    correctCount = node.totalDescendantCorrectCount;
  } else if (node.latestAttempts) {
    const attempts = node.latestAttempts;
    for (let i = 0; i < node.questions.length; i++) {
      const att = attempts[node.questions[i].id];
      if (att) {
        answeredCount++;
        if (att.is_correct) correctCount++;
      }
    }
  }

  const accuracy = hasChildren
    ? node.aggregateAccuracyRate
    : answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 100)
      : 0;

  return (
    <div className="w-full contain-list-item cv-auto-row">
      <div
        id={`battery-card-${node.id}`}
        role="button"
        tabIndex={0}
        onClick={() => onInspectBattery(node)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onInspectBattery(node);
          }
        }}
        className={`group rounded-xl px-4 py-3.5 transition-colors duration-150 cursor-pointer ${
          isHighlighted
            ? 'bg-dark-card border border-brand-500/50 ring-1 ring-brand-500/40'
            : 'bg-dark-card/60 hover:bg-dark-card border border-white/5 hover:border-brand-500/30'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Clean Identity & Compact Metadata */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hasChildren && (
              <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0">
                <Folder size={15} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-dark-text truncate">
                  {node.title}
                </h4>
                <span className="text-[11px] font-mono text-dark-subtext shrink-0">
                  {totalQuestions} {totalQuestions === 1 ? t('questions.explorer.question') : t('questions.explorer.questions')}
                </span>
                {hasChildren && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20 shrink-0">
                    {node.children.length} {node.children.length === 1 ? t('questions.explorer.subgroup') : t('questions.explorer.subgroups')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-dark-subtext">
                {node.linkedPages && node.linkedPages.length > 0 ? (
                  node.linkedPages.slice(0, 1).map((p) => {
                    const pageTitle = getPageTitle?.(p.id) || p.title || 'Caderno';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToPage(p.id);
                        }}
                        className="font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Abrir página "${pageTitle}" no Caderno`}
                      >
                        <FileText size={11} />
                        <span className="truncate max-w-[180px]">{pageTitle}</span>
                        <ExternalLink size={10} className="opacity-70" />
                      </button>
                    );
                  })
                ) : node.page_id ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToPage(node.page_id!);
                    }}
                    className="font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Abrir página "${getPageTitle?.(node.page_id) || 'Caderno'}" no Caderno`}
                  >
                    <FileText size={11} />
                    <span className="truncate max-w-[180px]">{getPageTitle?.(node.page_id) || 'Caderno'}</span>
                    <ExternalLink size={10} className="opacity-70" />
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-dark-subtext/80">
                    <Zap size={10} className="text-amber-400" />
                    <span>{t('questions.explorer.standaloneBattery')}</span>
                  </span>
                )}

                {totalQuestions > 0 && (
                  <span className="font-mono text-dark-subtext/80">
                    • {answeredCount}/{totalQuestions} {t('questions.explorer.answered')}
                    {answeredCount > 0 && (
                      <span className={`ml-1.5 ${accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ({accuracy}%)
                      </span>
                    )}
                  </span>
                )}

                {(node.tags || []).slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] text-dark-subtext/70">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Clean Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity duration-150">
              {onCreateSubgroup && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSubgroup(node.id);
                  }}
                  className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer"
                  title={t('questions.explorer.addSubgroupTitle', { title: node.title })}
                >
                  <Plus size={14} className="text-brand-400" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBattery(node);
                }}
                className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer"
                title={t('questions.explorer.editBattery')}
              >
                <Edit3 size={14} />
              </button>

              {onOpenMoveModal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMoveModal(node);
                  }}
                  className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer"
                  title={t('questions.explorer.moveBattery')}
                >
                  <FolderInput size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBattery(node.id);
                }}
                className="p-1.5 rounded-lg text-dark-subtext hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title={t('questions.explorer.moveToTrash')}
              >
                <Trash2 size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayBattery(node);
              }}
              className="px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              title={hasChildren ? t('questions.explorer.practiceAllDesc') : t('questions.explorer.practiceDesc')}
            >
              <Play size={12} className="fill-brand-300" />
              <span className="hidden sm:inline">{hasChildren ? t('questions.explorer.practiceAll') : t('questions.explorer.practice')}</span>
            </button>

            <ChevronRight size={15} className="text-dark-subtext/50 group-hover:text-dark-subtext transition-colors hidden sm:block" />
          </div>
        </div>
      </div>
    </div>
  );
});
