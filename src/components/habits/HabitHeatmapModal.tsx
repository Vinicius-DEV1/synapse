import React from 'react';
import {
  X,
  Flame,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import { HabitScorecards } from './ui/HabitScorecards';
import { HabitHeatmapGrid } from './ui/HabitHeatmapGrid';
import { useHabitHeatmapData } from './hooks/useHabitHeatmapData';

export interface HabitHeatmapModalProps {
  habitId: string;
  initialDate?: string;
  onClose: () => void;
  onHabitUpdated?: () => void;
}

export const HabitHeatmapModal: React.FC<HabitHeatmapModalProps> = ({
  habitId,
  initialDate,
  onClose,
  onHabitUpdated,
}) => {
  const {
    habit,
    isEditingTitle,
    setIsEditingTitle,
    titleInput,
    setTitleInput,
    showDeleteConfirm,
    setShowDeleteConfirm,
    hoveredCell,
    setHoveredCell,
    stats,
    completedDateSet,
    heatmapGrid,
    monthLabels,
    handleToggleDay,
    handleSaveTitle,
    handleDeleteHabit,
  } = useHabitHeatmapData({
    habitId,
    initialDate,
    onClose,
    onHabitUpdated,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mapa de Atividade do Hábito"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col gap-6 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame size={20} />
            </span>

            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="w-full px-3 py-1 text-base font-semibold bg-zinc-800 border border-white/20 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                  title="Salvar título"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-semibold text-white tracking-tight truncate">
                  {habit?.title || 'Carregando hábito...'}
                </h2>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 text-zinc-500 hover:text-zinc-200 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Renomear hábito"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
              title="Excluir hábito"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Notice */}
        {showDeleteConfirm && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in slide-in-from-top-2 duration-150">
            <span>Deseja realmente excluir este hábito e seu histórico?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteHabit}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        )}

        {/* Scorecards */}
        <HabitScorecards stats={stats} />

        {/* Heatmap Matrix */}
        <HabitHeatmapGrid
          heatmapGrid={heatmapGrid}
          monthLabels={monthLabels}
          completedDateSet={completedDateSet}
          hoveredCell={hoveredCell}
          onToggleDay={handleToggleDay}
          onMouseEnterCell={(date, completed) => setHoveredCell({ date, completed })}
          onMouseLeaveCell={() => setHoveredCell(null)}
        />

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-white/[0.06] pt-3">
          <span>
            {stats.currentStreak > 0
              ? `🔥 Você está consistente há ${stats.currentStreak} ${stats.currentStreak === 1 ? 'dia' : 'dias'}!`
              : 'Marque o dia de hoje para continuar sua sequência.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitHeatmapModal;
