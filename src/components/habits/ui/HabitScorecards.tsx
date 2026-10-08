import React from 'react';
import { Flame, Trophy, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import type { HabitStats } from '../../../types/habits';

interface HabitScorecardsProps {
  stats: HabitStats;
}

export const HabitScorecards = React.memo(function HabitScorecards({
  stats,
}: HabitScorecardsProps) {
  return (
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
  );
});
