import React from 'react';
import { ArrowLeft, Activity } from 'lucide-react';
import { ActivityHeatmap } from './stats/ActivityHeatmap';
import { MaturityPieChart } from './stats/MaturityPieChart';
import { RatingDistributionChart } from './stats/RatingDistributionChart';
import { CreationLineChart } from './stats/CreationLineChart';
import { ForecastBarChart } from './stats/ForecastBarChart';
import { StatsOverviewGrid } from './stats/StatsOverviewGrid';
import { useAnkiStats } from './hooks/useAnkiStats';

interface AnkiStatsProps {
  onBack: () => void;
}

export default function AnkiStats({ onBack }: AnkiStatsProps) {
  const {
    loading,
    stats,
    historyData,
    forecastData,
    maturityData,
    ratingData,
    cardsCreatedData,
    heatmapData,
  } = useAnkiStats();

  return (
    <div className="w-full animate-fade-in pb-20">
      <div className="w-full">
        <header className="mb-8 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 text-dark-subtext hover:text-white cursor-pointer w-fit transition-colors" onClick={onBack}>
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Voltar para Baralhos</span>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-500" />
              Estatísticas
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-dark-subtext">
            Calculando estatísticas...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Stats & FSRS Metrics Grid */}
            <StatsOverviewGrid stats={stats} />

            {/* Heatmap Section */}
            <ActivityHeatmap heatmapData={heatmapData} />

            {/* Pies and distributions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Maturity Pie Chart */}
              <MaturityPieChart maturityData={maturityData} />

              {/* Rating Distribution */}
              <RatingDistributionChart ratingData={ratingData} />
            </div>

            {/* Lines and Bars Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Cards Created Chart */}
              <CreationLineChart cardsCreatedData={cardsCreatedData} />

              {/* Forecast Chart */}
              <ForecastBarChart forecastData={forecastData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

