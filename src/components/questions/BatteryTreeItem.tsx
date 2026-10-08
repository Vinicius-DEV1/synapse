import React from 'react';
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  Edit3,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
  FolderInput,
} from 'lucide-react';
import type { BatteryTreeNode, BatteryWithQuestions } from '../../types/quiz';

interface BatteryTreeItemProps {
  node: BatteryTreeNode;
  depth?: number;
  onPlayBattery: (battery: BatteryWithQuestions) => void;
  onEditBattery: (battery: BatteryWithQuestions) => void;
  onDeleteBattery: (batteryId: string) => void;
  onNavigateToPage: (pageId: string) => void;
  onCreateSubgroup?: (parentBatteryId: string) => void;
  onOpenMoveModal?: (battery: BatteryWithQuestions) => void;
  getPageTitle?: (pageId: string) => string | null;
  highlightedBatteryId?: string;
  expandedBatteryIds: Set<string>;
  onToggleExpand: (batteryId: string) => void;
}

export const BatteryTreeItem = React.memo(function BatteryTreeItem({
  node,
  depth = 0,
  onPlayBattery,
  onEditBattery,
  onDeleteBattery,
  onNavigateToPage,
  onCreateSubgroup,
  onOpenMoveModal,
  getPageTitle,
  highlightedBatteryId,
  expandedBatteryIds,
  onToggleExpand,
}: BatteryTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedBatteryIds.has(node.id);
  const isHighlighted = node.id === highlightedBatteryId;

  // Stats calculation
  const totalQuestions = hasChildren ? node.totalDescendantQuestionsCount : node.questions.length;
  const answeredCount = hasChildren
    ? node.totalDescendantAnsweredCount
    : node.questions.filter((q) => node.latestAttempts?.[q.id]).length;
  const correctCount = hasChildren
    ? node.totalDescendantCorrectCount
    : node.questions.filter((q) => node.latestAttempts?.[q.id]?.is_correct).length;
  const accuracy = hasChildren
    ? node.aggregateAccuracyRate
    : answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 100)
      : 0;

  return (
    <div className="w-full">
      <div
        id={`battery-card-${node.id}`}
        className={`group rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${
          isHighlighted
            ? 'bg-dark-card border border-brand-500/50 ring-1 ring-brand-500/40'
            : hasChildren
              ? 'bg-dark-card/80 hover:bg-dark-card border border-white/[0.08] hover:border-brand-500/30'
              : 'bg-dark-card/60 hover:bg-dark-card/90 border border-white/5 hover:border-brand-500/30'
        }`}
        style={{ contentVisibility: 'auto', containIntrinsicSize: '160px' }}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Expand / Collapse Button */}
            <button
              onClick={() => onToggleExpand(node.id)}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors mt-0.5 cursor-pointer shrink-0"
              title={isExpanded ? 'Recolher questões' : 'Expandir questões'}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Folder Icon for Groups with children */}
            {hasChildren && (
              <div className="p-2 rounded-xl bg-brand-500/15 border border-brand-500/25 text-brand-300 shrink-0 mt-0.5">
                {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                  {node.title}
                </h4>

                {hasChildren ? (
                  <>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 shrink-0">
                      {node.children.length} {node.children.length === 1 ? 'subgrupo' : 'subgrupos'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                      {totalQuestions} {totalQuestions === 1 ? 'questão' : 'questões'}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                    {totalQuestions} {totalQuestions === 1 ? 'questão' : 'questões'}
                  </span>
                )}
              </div>

              {node.description && (
                <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{node.description}</p>
              )}

              {/* Origin Pages & Tags Row */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Page Link */}
                {node.linkedPages && node.linkedPages.length > 0 ? (
                  node.linkedPages.map((p) => {
                    const pageTitle = getPageTitle?.(p.id) || p.title || 'Caderno';
                    return (
                      <button
                        key={p.id}
                        onClick={() => onNavigateToPage(p.id)}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Abrir página "${pageTitle}" no Caderno`}
                      >
                        <FileText size={11} />
                        <span className="truncate max-w-xs">{pageTitle}</span>
                        <ExternalLink size={10} className="opacity-70" />
                      </button>
                    );
                  })
                ) : node.page_id ? (
                  <button
                    onClick={() => onNavigateToPage(node.page_id!)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Abrir página "${getPageTitle?.(node.page_id) || 'Caderno'}" no Caderno`}
                  >
                    <FileText size={11} />
                    <span className="truncate max-w-xs">{getPageTitle?.(node.page_id) || 'Caderno'}</span>
                    <ExternalLink size={10} className="opacity-70" />
                  </button>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-400 flex items-center gap-1">
                    <Zap size={10} className="text-amber-400" />
                    <span>Bateria Avulsa</span>
                  </span>
                )}

                {/* Tags */}
                {(node.tags || []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions (Right) */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            {/* Quick Add Subgroup Button */}
            {onCreateSubgroup && (
              <button
                onClick={() => onCreateSubgroup(node.id)}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                title={`Adicionar subgrupo dentro de "${node.title}"`}
              >
                <Plus size={13} className="text-brand-400" />
                <span className="hidden sm:inline">Subgrupo</span>
              </button>
            )}

            {/* Play Button */}
            <button
              onClick={() => onPlayBattery(node)}
              className="px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title={hasChildren ? 'Praticar todas as questões do grupo e subgrupos' : 'Praticar no Modo Foco'}
            >
              <Play size={13} className="fill-brand-300" />
              <span className="hidden sm:inline">{hasChildren ? 'Praticar Tudo' : 'Praticar'}</span>
            </button>

            {/* Edit Button */}
            <button
              onClick={() => onEditBattery(node)}
              className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Editar bateria"
            >
              <Edit3 size={15} />
            </button>

            {/* Move Button */}
            {onOpenMoveModal && (
              <button
                onClick={() => onOpenMoveModal(node)}
                className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                title="Mover para outro grupo"
              >
                <FolderInput size={15} />
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={() => onDeleteBattery(node.id)}
              className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-white/5 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Mover para lixeira"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress Mini Bar */}
        {totalQuestions > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-3">
              <span>
                {answeredCount}/{totalQuestions} respondidas
              </span>
              {answeredCount > 0 && (
                <span className={accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                  • {accuracy}% acertos
                </span>
              )}
            </div>
          </div>
        )}

        {/* Expanded Questions Details for this battery (if it has own questions) */}
        {isExpanded && node.questions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2.5">
            {node.questions.map((q, idx) => {
              const attempt = node.latestAttempts?.[q.id];
              const isAnswered = Boolean(attempt);
              const isCorrect = attempt ? attempt.is_correct : false;

              return (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-dark-bg/60 border border-white/[0.04] flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="font-mono text-zinc-500 text-[11px] shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-zinc-200 leading-relaxed font-medium">
                        {q.question || 'Questão sem enunciado cadastrado'}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400">
                        <span className="font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">
                          {q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Discursiva'}
                        </span>
                        {(q.tags || []).map((t) => (
                          <span key={t} className="text-zinc-500">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isAnswered ? (
                      isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                          <CheckCircle2 size={11} />
                          <span>Acertou</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25">
                          <XCircle size={11} />
                          <span>Errou</span>
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-zinc-500 border border-white/10">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recursive Children Container with elegant Guide Lines */}
      {isExpanded && hasChildren && (
        <div className="mt-3 ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-brand-500/20 space-y-3 animate-fade-in">
          {node.children.map((child) => (
            <BatteryTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onPlayBattery={onPlayBattery}
              onEditBattery={onEditBattery}
              onDeleteBattery={onDeleteBattery}
              onNavigateToPage={onNavigateToPage}
              onCreateSubgroup={onCreateSubgroup}
              onOpenMoveModal={onOpenMoveModal}
              getPageTitle={getPageTitle}
              highlightedBatteryId={highlightedBatteryId}
              expandedBatteryIds={expandedBatteryIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
});
