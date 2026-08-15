import React from 'react';
import { Flame, CheckCircle2, TrendingUp, BrainCircuit, Target, Zap } from 'lucide-react';
import type { AnkiStatsSummary } from './ankiStatsCalculator';

interface StatsOverviewGridProps {
  stats: AnkiStatsSummary;
}

export function StatsOverviewGrid({ stats }: StatsOverviewGridProps) {
  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-500/20 flex items-center justify-center rounded-xl text-orange-400">
              <Flame size={20} />
            </div>
            <p className="text-dark-subtext text-xs md:text-sm">Ofensiva</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {stats.streak} <span className="text-base text-dark-subtext font-normal">dias</span>
          </p>
        </div>

        <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-500/20 flex items-center justify-center rounded-xl text-indigo-400">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-dark-subtext text-xs md:text-sm">Estudados Hoje</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.studiedToday}</p>
        </div>

        <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center rounded-xl text-green-400">
              <TrendingUp size={20} />
            </div>
            <p className="text-dark-subtext text-xs md:text-sm">Retenção (Hoje)</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.retentionRate}%</p>
        </div>

        <div className="bg-dark-card border border-white/5 p-4 md:p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 flex items-center justify-center rounded-xl text-blue-400">
              <BrainCircuit size={20} />
            </div>
            <p className="text-dark-subtext text-xs md:text-sm">Total de Cartões</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalCards}</p>
        </div>
      </div>

      {/* FSRS Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-dark-card border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 flex items-center justify-center rounded-xl text-emerald-400">
            <Target size={24} />
          </div>
          <div>
            <p className="text-dark-subtext text-sm mb-1">Estabilidade Média (FSRS)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{stats.avgStability}</p>
              <p className="text-sm text-dark-subtext">dias até esquecer</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/20 flex items-center justify-center rounded-xl text-rose-400">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-dark-subtext text-sm mb-1">Dificuldade Média (FSRS)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{stats.avgDifficulty}</p>
              <p className="text-sm text-dark-subtext">/ 10 (nível do baralho)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
