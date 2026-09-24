import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Flame, Check, Activity, AlertCircle } from 'lucide-react';
import { getStoreState } from '../../store/useStore';
import {
  getLocalDateString,
  resolveDateFromPageTitle,
  broadcastHabitUpdate,
} from '../../utils/habitUtils';
import { playUiToggleSound } from '../../utils/uiSounds';
import { HabitHeatmapModal } from '../habits/HabitHeatmapModal';
import { Portal } from '../ui/Portal';

export default function HabitWidgetNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const { habitId, targetDate, title: initialTitle, streak: initialStreak } = node.attrs;

  const [title, setTitle] = useState<string>(initialTitle || 'Hábito');
  const [streak, setStreak] = useState<number>(Number(initialStreak) || 0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  // Determine effective date for this habit check
  const effectiveDate = useMemo(() => {
    if (targetDate) return targetDate;

    // Resolve from the active page in the store
    const storeState = getStoreState();
    const activeTab = storeState.tabs?.find((t) => t.id === storeState.activeTabId);
    const activePage = storeState.pages?.find((p) => p.id === (activeTab?.pageId || activeTab?.id));

    return resolveDateFromPageTitle(activePage?.title);
  }, [targetDate]);

  const loadStatus = useCallback(async () => {
    if (!habitId || !window.api?.habits) {
      if (mountedRef.current) setIsLoading(false);
      return;
    }

    try {
      if (mountedRef.current) setIsLoading(true);
      const data = await window.api.habits.getHabitWithStats(habitId);

      if (!mountedRef.current) return;

      if (!data || !data.habit) {
        setIsNotFound(true);
        return;
      }

      setIsNotFound(false);
      setTitle(data.habit.title);
      setStreak(data.stats.currentStreak);

      const done = data.logs.some((l) => l.date === effectiveDate);
      setIsCompleted(done);

      // Keep TipTap attributes warm in background for 0ms SWR transitions
      if (data.habit.title !== initialTitle || data.stats.currentStreak !== initialStreak) {
        updateAttributes({
          title: data.habit.title,
          streak: data.stats.currentStreak,
        });
      }
    } catch (err) {
      console.error('Failed to load habit status in widget:', err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [habitId, effectiveDate, initialTitle, initialStreak, updateAttributes]);

  useEffect(() => {
    mountedRef.current = true;
    loadStatus();

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.habitId || detail.habitId === habitId) {
        loadStatus();
      }
    };

    window.addEventListener('caderno-habit-updated', handleUpdate);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('caderno-habit-updated', handleUpdate);
    };
  }, [habitId, effectiveDate, loadStatus]);

  const handleToggleCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.api?.habits || isNotFound) return;

    try {
      playUiToggleSound();
      const nextCompleted = !isCompleted;
      setIsCompleted(nextCompleted);

      // Optimistic streak adjustment
      setStreak((prev) => (nextCompleted ? prev + 1 : Math.max(0, prev - 1)));

      const res = await window.api.habits.toggleDayLog(habitId, effectiveDate);
      setIsCompleted(res.completed);

      broadcastHabitUpdate({
        habitId,
        date: effectiveDate,
        completed: res.completed,
      });
    } catch (err) {
      console.error('Failed to toggle habit check:', err);
      // Rollback on failure
      loadStatus();
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  if (isNotFound) {
    return (
      <NodeViewWrapper as="span" className="inline-block align-middle mx-1 my-0.5">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs select-none">
          <AlertCircle size={13} />
          <span className="italic line-through">{initialTitle || 'Hábito'}</span>
          <span className="text-[10px] opacity-75">(Excluído)</span>
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle mx-1 my-0.5 select-none">
      <span
        onClick={handleOpenModal}
        className={`group inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer ${
          isCompleted
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:border-emerald-500/50 shadow-sm shadow-emerald-500/5'
            : 'bg-zinc-900/90 border-white/[0.08] text-zinc-200 hover:bg-zinc-850 hover:border-white/20'
        }`}
        title={`Hábito: ${title} (${effectiveDate}) • Clique para ver histórico`}
      >
        {/* Custom Checkbox */}
        <button
          type="button"
          onClick={handleToggleCheck}
          className={`flex items-center justify-center w-4 h-4 rounded transition-all duration-150 ${
            isCompleted
              ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/20'
              : 'border border-white/25 hover:border-emerald-400 bg-white/[0.03]'
          }`}
          title={isCompleted ? 'Desmarcar dia' : 'Marcar dia como feito'}
        >
          {isCompleted && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Title */}
        <span className="text-xs font-medium tracking-tight truncate max-w-[180px]">
          {title}
        </span>

        {/* Streak Pill */}
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none font-semibold ${
            isCompleted
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              : streak > 0
              ? 'bg-zinc-800 text-zinc-400 border border-white/[0.06]'
              : 'bg-white/[0.04] text-zinc-500'
          }`}
        >
          <Flame size={10} className={isCompleted || streak > 0 ? 'text-amber-400' : 'text-zinc-500'} />
          <span>{streak}</span>
        </span>

        {/* Activity Heatmap Toggle Indicator */}
        <span
          className="text-zinc-500 hover:text-zinc-200 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5"
          title="Ver mapa de atividade anual"
        >
          <Activity size={12} />
        </span>
      </span>

      {/* Heatmap Modal Portal */}
      {showModal && (
        <Portal>
          <HabitHeatmapModal
            habitId={habitId}
            initialDate={effectiveDate}
            onClose={() => setShowModal(false)}
            onHabitUpdated={loadStatus}
          />
        </Portal>
      )}
    </NodeViewWrapper>
  );
}
