import React from 'react';
import { Play, Edit3, ExternalLink, Trash2, CheckCircle2, Tag } from 'lucide-react';

interface QuestionBlockCardProps {
  title: string;
  description: string;
  stats: {
    total: number;
    answered: number;
    correct: number;
    accuracy: number;
  };
  displayTags: string[];
  isSelected: boolean;
  onSelectNode: () => void;
  onPlayFocusMode: () => void;
  onOpenQuestionsModule: () => void;
  onEditQuestions: () => void;
  onDeleteBlock: () => void;
}

export const QuestionBlockCard = React.memo(function QuestionBlockCard({
  title,
  description,
  stats,
  displayTags,
  isSelected,
  onSelectNode,
  onPlayFocusMode,
  onOpenQuestionsModule,
  onEditQuestions,
  onDeleteBlock,
}: QuestionBlockCardProps) {
  return (
    <div
      onMouseDown={onSelectNode}
      className={`group w-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border select-none transition-all duration-150 ${
        isSelected
          ? 'bg-dark-card/90 border-brand-400 ring-1 ring-brand-400/50 shadow-sm'
          : 'bg-dark-card/50 hover:bg-white/[0.04] border-white/5 hover:border-brand-500/30'
      }`}
      style={{ contain: 'layout style' }}
    >
      {/* Left Side: Icon, Title, Badges */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
          <CheckCircle2 size={15} />
        </div>

        <span
          className="text-xs sm:text-sm font-semibold text-dark-text truncate w-40 sm:w-60 md:w-72 shrink-0"
          title={title}
        >
          {title}
        </span>

        <span
          title={`${stats.total} ${stats.total === 1 ? 'questão' : 'questões'}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-dark-subtext shrink-0 w-[80px] text-center"
        >
          {stats.total} {stats.total === 1 ? 'q' : 'qs'}
        </span>

        {stats.answered > 0 ? (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[11px] font-mono text-emerald-400/90 font-medium shrink-0 flex items-center justify-center gap-1 w-[90px]">
            <span>{stats.accuracy}% acertos</span>
          </span>
        ) : (
          <span className="w-[90px] shrink-0" />
        )}

        {displayTags.length > 0 && (
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            {displayTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-dark-subtext flex items-center gap-0.5"
              >
                <Tag size={9} className="text-dark-subtext/70" />
                <span>{tag}</span>
              </span>
            ))}
            {displayTags.length > 2 && (
              <span className="text-[10px] text-dark-subtext/70 font-mono">+{displayTags.length - 2}</span>
            )}
          </div>
        )}

        {description && (
          <span className="hidden 2xl:inline text-xs text-dark-subtext truncate max-w-xs" title={description}>
            <span className="opacity-50 mr-1">•</span>
            {description}
          </span>
        )}
      </div>

      {/* Right Side: Quick Actions & Launch Button (Revealed on Hover) */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayFocusMode();
          }}
          className="px-2.5 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Iniciar no Modo Foco"
        >
          <Play size={11} className="fill-brand-300 shrink-0" />
          <span className="hidden sm:inline">Iniciar no Modo Foco</span>
          <span className="sm:hidden">Foco</span>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenQuestionsModule();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Abrir no Módulo de Questões"
          >
            <ExternalLink size={13} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditQuestions();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Editar questões"
          >
            <Edit3 size={13} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteBlock();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Remover bloco da nota"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
});
