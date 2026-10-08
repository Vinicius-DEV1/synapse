import React from 'react';

export interface HeatmapCell {
  date: string;
  dayOfWeek: number;
  month: number;
  isToday: boolean;
}

export interface MonthLabel {
  index: number;
  name: string;
}

interface HabitHeatmapGridProps {
  heatmapGrid: HeatmapCell[];
  monthLabels: MonthLabel[];
  completedDateSet: Set<string>;
  hoveredCell: { date: string; completed: boolean } | null;
  onToggleDay: (date: string) => void;
  onMouseEnterCell: (date: string, completed: boolean) => void;
  onMouseLeaveCell: () => void;
}

export const HabitHeatmapGrid = React.memo(function HabitHeatmapGrid({
  heatmapGrid,
  monthLabels,
  completedDateSet,
  hoveredCell,
  onToggleDay,
  onMouseEnterCell,
  onMouseLeaveCell,
}: HabitHeatmapGridProps) {
  return (
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
                    onClick={() => onToggleDay(c.date)}
                    onMouseEnter={() => onMouseEnterCell(c.date, isDone)}
                    onMouseLeave={onMouseLeaveCell}
                    className={`w-[13px] h-[13px] rounded-[3px] transition-all duration-100 cursor-pointer ${
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
  );
});
