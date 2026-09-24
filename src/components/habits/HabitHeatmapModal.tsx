import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  TrendingUp,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import type { Habit, HabitLog, HabitStats } from '../../types/habits';
import {
  calculateHabitStreak,
  getLocalDateString,
  broadcastHabitUpdate,
} from '../../utils/habitUtils';
import { playUiToggleSound, playUiClickSound, playUiDeleteSound } from '../../utils/uiSounds';

export interface HabitHeatmapModalProps {
  habitId: string;
  initialDate?: string;
  onClose: () => void;
  onHabitUpdated?: () => void;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export const HabitHeatmapModal: React.FC<HabitHeatmapModalProps> = ({
  habitId,
  initialDate,
  onClose,
  onHabitUpdated,
}) => {
  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; completed: boolean } | null>(null);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const referenceDate = initialDate || todayStr;

  const loadHabitData = useCallback(async () => {
    if (!window.api?.habits) return;
    try {
      const [h, l] = await Promise.all([
        window.api.habits.getHabit(habitId),
        window.api.habits.getLogs(habitId),
      ]);
      setHabit(h);
      setLogs(l);
      setTitleInput(h?.title || '');
    } catch (err) {
      console.error('Failed to load habit data:', err);
    }
  }, [habitId]);

  useEffect(() => {
    loadHabitData();

    const handleHabitUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.habitId === habitId) {
        loadHabitData();
      }
    };

    window.addEventListener('caderno-habit-updated', handleHabitUpdate);
    return () => window.removeEventListener('caderno-habit-updated', handleHabitUpdate);
  }, [habitId, loadHabitData]);

  // Keyboard navigation: Escape closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Set of completed date strings for $O(1)$ lookup
  const completedDateSet = useMemo(() => {
    return new Set(logs.map((l) => l.date));
  }, [logs]);

  // Computed statistics
  const stats: HabitStats = useMemo(() => {
    return calculateHabitStreak(logs, referenceDate);
  }, [logs, referenceDate]);

  // 52-week matrix generation (ending at the end of the current week)
  const heatmapGrid = useMemo(() => {
    const cells: { date: string; dayOfWeek: number; month: number; isToday: boolean }[] = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday

    // Align to the end of the current week (Saturday)
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - dayOfWeek));

    // 52 weeks = 364 days + 7 days padding = 371 days total
    const totalDays = 53 * 7;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - totalDays + 1);

    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateStr = getLocalDateString(curr);
      cells.push({
        date: dateStr,
        dayOfWeek: curr.getDay(),
        month: curr.getMonth(),
        isToday: dateStr === todayStr,
      });
      curr.setDate(curr.getDate() + 1);
    }

    return cells;
  }, [todayStr]);

  // Group columns for month header labels
  const monthLabels = useMemo(() => {
    const labels: { index: number; name: string }[] = [];
    let lastMonth = -1;

    for (let i = 0; i < heatmapGrid.length; i += 7) {
      const cell = heatmapGrid[i];
      if (cell && cell.month !== lastMonth) {
        lastMonth = cell.month;
        labels.push({ index: Math.floor(i / 7), name: MONTH_NAMES[cell.month] });
      }
    }
    return labels;
  }, [heatmapGrid]);

  const handleToggleDay = async (date: string) => {
    if (!window.api?.habits || !habit) return;
    try {
      const nextDone = !completedDateSet.has(date);
      playUiToggleSound(nextDone);
      const res = await window.api.habits.toggleDayLog(habit.id, date);
      setLogs((prev) => {
        if (res.completed) {
          const newLog: HabitLog = {
            id: `${habit.id}_${date}`,
            habit_id: habit.id,
            date,
            completed_at: new Date().toISOString(),
          };
          return [...prev, newLog];
        } else {
          return prev.filter((l) => l.date !== date);
        }
      });
      broadcastHabitUpdate({ habitId: habit.id, date, completed: res.completed });
      onHabitUpdated?.();
    } catch (err) {
      console.error('Failed to toggle day log:', err);
    }
  };

  const handleSaveTitle = async () => {
    if (!window.api?.habits || !habit || !titleInput.trim()) return;
    try {
      playUiClickSound();
      const trimmed = titleInput.trim();
      await window.api.habits.updateHabit(habit.id, { title: trimmed });
      setHabit((prev) => (prev ? { ...prev, title: trimmed } : null));
      setIsEditingTitle(false);
      broadcastHabitUpdate({ habitId: habit.id });
      onHabitUpdated?.();
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  const handleDeleteHabit = async () => {
    if (!window.api?.habits || !habit) return;
    try {
      playUiDeleteSound();
      await window.api.habits.deleteHabit(habit.id);
      broadcastHabitUpdate({ habitId: habit.id });
      onHabitUpdated?.();
      onClose();
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

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
                  className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
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
                  className="p-1 text-zinc-500 hover:text-zinc-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Excluir hábito"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
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
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteHabit}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium"
              >
                Excluir
              </button>
            </div>
          </div>
        )}

        {/* Scorecards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-950/60 border border-white/[0.04] p-3.5 rounded-xl flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Flame size={14} className="text-amber-400" />
              Sequência Atual
            </span>
            <span className="text-xl font-bold font-mono text-zinc-100">
              {stats.currentStreak} {stats.currentStreak === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          <div className="bg-zinc-950/60 border border-white/[0.04] p-3.5 rounded-xl flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Trophy size={14} className="text-yellow-400" />
              Melhor Sequência
            </span>
            <span className="text-xl font-bold font-mono text-zinc-100">
              {stats.bestStreak} {stats.bestStreak === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          <div className="bg-zinc-950/60 border border-white/[0.04] p-3.5 rounded-xl flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <CalendarIcon size={14} className="text-emerald-400" />
              Total Realizado
            </span>
            <span className="text-xl font-bold font-mono text-zinc-100">
              {stats.totalCompleted} {stats.totalCompleted === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          <div className="bg-zinc-950/60 border border-white/[0.04] p-3.5 rounded-xl flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <TrendingUp size={14} className="text-sky-400" />
              Taxa (30 dias)
            </span>
            <span className="text-xl font-bold font-mono text-zinc-100">
              {stats.completionRate30Days}%
            </span>
          </div>
        </div>

        {/* Heatmap Matrix */}
        <div className="bg-zinc-950/40 border border-white/[0.04] p-4 sm:p-5 rounded-2xl flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">
              Consistência Anual (52 Semanas)
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span>Menos</span>
              <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.05]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-500/30" />
              <span>Mais</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
            <div className="flex flex-col gap-1 min-w-max select-none">
              {/* Months header */}
              <div className="grid grid-flow-col auto-cols-[13px] gap-1 text-[10px] text-zinc-500 h-4 pl-6">
                {monthLabels.map((m) => (
                  <div
                    key={`${m.name}-${m.index}`}
                    style={{ gridColumnStart: m.index + 1 }}
                    className="truncate"
                  >
                    {m.name}
                  </div>
                ))}
              </div>

              {/* Grid 7 rows x 53 columns */}
              <div className="flex gap-2">
                {/* Weekday labels */}
                <div className="grid grid-rows-7 gap-1 text-[9px] text-zinc-500 leading-[13px]">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                {/* Days matrix */}
                <div className="grid grid-rows-7 grid-flow-col gap-1">
                  {heatmapGrid.map((c) => {
                    const isDone = completedDateSet.has(c.date);
                    return (
                      <button
                        key={c.date}
                        type="button"
                        onClick={() => handleToggleDay(c.date)}
                        onMouseEnter={() => setHoveredCell({ date: c.date, completed: isDone })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-[13px] h-[13px] rounded-[3px] transition-all duration-100 ${
                          isDone
                            ? 'bg-emerald-500 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20'
                            : 'bg-white/[0.05] hover:bg-white/[0.15]'
                        } ${c.isToday ? 'ring-1.5 ring-amber-400/80 ring-offset-1 ring-offset-zinc-900' : ''}`}
                        title={`${c.date} • ${isDone ? 'Concluído' : 'Não realizado'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Cell Hover Details Bar */}
          <div className="min-h-[20px] text-xs text-zinc-400 flex items-center justify-between px-1">
            {hoveredCell ? (
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="font-mono">{hoveredCell.date}</span>
                <span>•</span>
                <span className={hoveredCell.completed ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                  {hoveredCell.completed ? '✓ Concluído' : '○ Não realizado'}
                </span>
                <span className="text-zinc-600 text-[11px]">(Clique para alternar)</span>
              </span>
            ) : (
              <span className="text-zinc-600 text-[11px]">
                Passe o cursor sobre os dias para ver detalhes ou clique para marcar retroativamente.
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-white/[0.06] pt-3">
          <span>
            {stats.currentStreak > 0
              ? `🔥 Você está consistente há ${stats.currentStreak} ${stats.currentStreak === 1 ? 'dia' : 'dias'}!`
              : 'Marque o dia de hoje para continuar sua sequência.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitHeatmapModal;
