import React from 'react';
import { Activity } from 'lucide-react';

interface ActivityHeatmapProps {
  heatmapData: { date: string; count: number }[];
}

export function ActivityHeatmap({ heatmapData }: ActivityHeatmapProps) {
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-white/5';
    if (count < 10) return 'bg-indigo-900/50';
    if (count < 30) return 'bg-indigo-600/70';
    if (count < 60) return 'bg-indigo-500';
    return 'bg-indigo-400';
  };

  return (
    <div className="bg-dark-card border border-white/5 p-6 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="text-indigo-400" size={20} />
        <h3 className="text-lg font-semibold text-white">Consistência (Último Ano)</h3>
      </div>
      <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex flex-col gap-1 min-w-max">
          <div className="grid grid-rows-7 grid-flow-col gap-1.5 justify-start">
            {heatmapData.map((d, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-sm ${getHeatmapColor(d.count)} transition-colors duration-200 hover:ring-2 hover:ring-white/30`}
                title={`${d.date}: ${d.count} revisões`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-dark-subtext mt-2 px-1">
            <span>Há 1 Ano</span>
            <span>Hoje</span>
          </div>
        </div>
      </div>
    </div>
  );
}
