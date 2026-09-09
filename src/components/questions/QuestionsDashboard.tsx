import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, BookOpen, Sparkles, Flame, TrendingUp, AlertTriangle } from 'lucide-react';
import type { QuizStats } from '../../types/quiz';

interface QuestionsDashboardProps {
  stats: QuizStats;
  onLaunchErrorNotebook: () => void;
  onLaunchQuickSimulation: () => void;
  onCreateBattery: () => void;
}

export const QuestionsDashboard = React.memo(function QuestionsDashboard({
  stats,
  onLaunchErrorNotebook,
  onLaunchQuickSimulation,
  onCreateBattery,
}: QuestionsDashboardProps) {
  const sortedTags = Object.entries(stats.tagStats || {}).sort(
    ([, a], [, b]) => b.total - a.total
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Questions */}
        <div className="bg-dark-card border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Questões</span>
            <HelpCircle size={16} className="text-zinc-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-zinc-100 font-mono">
              {stats.totalQuestions}
            </span>
            <span className="text-xs text-zinc-500">em {stats.totalBatteries} baterias</span>
          </div>
        </div>

        {/* Answered vs Pending */}
        <div className="bg-dark-card border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Respondidas</span>
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-zinc-100 font-mono">
              {stats.answeredQuestions}
            </span>
            <span className="text-xs text-zinc-500">
              ({stats.totalQuestions > 0 ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Accuracy Rate */}
        <div className="bg-dark-card border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Taxa de Acertos</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-emerald-400 font-mono">
              {stats.accuracyRate}%
            </span>
            <span className="text-xs text-zinc-500">{stats.correctAnswers} acertos</span>
          </div>
        </div>

        {/* Errors Pending Review */}
        <div className="bg-dark-card border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Erros Recentes</span>
            <XCircle size={16} className="text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-rose-400 font-mono">
              {stats.incorrectAnswers}
            </span>
            <span className="text-xs text-zinc-500">precisam revisão</span>
          </div>
        </div>
      </div>

      {/* Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Caderno de Erros Card */}
        <div className="p-5 rounded-2xl bg-rose-500/[0.03] border border-rose-500/15 hover:border-rose-500/25 transition-all flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">Caderno de Erros</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Pratique uma sessão focada exclusivamente nas {stats.incorrectAnswers} questões que você errou anteriormente.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={onLaunchErrorNotebook}
              disabled={stats.incorrectAnswers === 0}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <Flame size={14} />
              <span>Revisar Erros ({stats.incorrectAnswers})</span>
            </button>
          </div>
        </div>

        {/* Simulado Rápido Card */}
        <div className="p-5 rounded-2xl bg-dark-card/60 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.06] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">Simulado Dinâmico</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Gere um simulado aleatório de 10 a 20 questões para manter sua retenção ativa no Modo Foco Zen.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onLaunchQuickSimulation}
              disabled={stats.totalQuestions === 0}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Simulado Rápido</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance by Subject / Tags Table */}
      <div className="bg-dark-card/50 border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <BookOpen size={16} className="text-zinc-400" />
            <span>Desempenho por Matéria / Tags</span>
          </h4>
          <span className="text-xs text-zinc-500">{sortedTags.length} tags registradas</span>
        </div>

        {sortedTags.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs space-y-3">
            <p>Nenhuma questão com tags catalogada ainda.</p>
            <button
              onClick={onCreateBattery}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
            >
              Criar Bateria de Questões
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTags.map(([tag, tStat]) => {
              const tagAccuracy =
                tStat.answered > 0 ? Math.round((tStat.correct / tStat.answered) * 100) : 0;

              return (
                <div
                  key={tag}
                  className="p-3 rounded-xl bg-dark-bg/60 border border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-zinc-200 capitalize truncate">
                      #{tag}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 shrink-0">
                      {tStat.total} {tStat.total === 1 ? 'questão' : 'questões'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    {/* Mini progress bar */}
                    <div className="w-28 sm:w-36 flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                        <span>{tStat.answered}/{tStat.total} resolvidas</span>
                        <span className={tagAccuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                          {tagAccuracy}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            tagAccuracy >= 70 ? 'bg-emerald-500' : tagAccuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${tagAccuracy}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right text-xs font-mono">
                      <span className="text-emerald-400">{tStat.correct} acertos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
