import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Habit, HabitLog, HabitStats } from '../../../types/habits';
import type { HeatmapCell, MonthLabel } from '../ui/HabitHeatmapGrid';
import {
  calculateHabitStreak,
  getLocalDateString,
  broadcastHabitUpdate,
} from '../../../utils/habitUtils';
import { playUiToggleSound, playUiClickSound, playUiDeleteSound } from '../../../utils/uiSounds';

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface UseHabitHeatmapDataProps {
  habitId: string;
  initialDate?: string;
  onClose: () => void;
  onHabitUpdated?: () => void;
}

export function useHabitHeatmapData({
  habitId,
  initialDate,
  onClose,
  onHabitUpdated,
}: UseHabitHeatmapDataProps) {
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

  // Set of completed date strings for O(1) lookup
  const completedDateSet = useMemo(() => {
    return new Set(logs.map((l) => l.date));
  }, [logs]);

  // Computed statistics
  const stats: HabitStats = useMemo(() => {
    return calculateHabitStreak(logs, referenceDate);
  }, [logs, referenceDate]);

  // 52-week matrix generation (ending at the end of the current week)
  const heatmapGrid: HeatmapCell[] = useMemo(() => {
    const cells: HeatmapCell[] = [];
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
  const monthLabels: MonthLabel[] = useMemo(() => {
    const labels: MonthLabel[] = [];
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

  return {
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
  };
}
