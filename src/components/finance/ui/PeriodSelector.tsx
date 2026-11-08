import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, History } from 'lucide-react';

export type PeriodFilter = { year: number; month: number } | 'all';

export interface PeriodSelectorProps {
  selectedPeriod: PeriodFilter;
  onChangePeriod: (period: PeriodFilter) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const PeriodSelector = React.memo(function PeriodSelector({
  selectedPeriod,
  onChangePeriod,
}: PeriodSelectorProps) {
  const currentNow = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, []);

  const isAll = selectedPeriod === 'all';
  const isCurrentMonth =
    !isAll &&
    selectedPeriod.year === currentNow.year &&
    selectedPeriod.month === currentNow.month;

  const handlePrevMonth = () => {
    if (isAll) {
      onChangePeriod({ year: currentNow.year, month: currentNow.month });
      return;
    }
    if (selectedPeriod.month === 0) {
      onChangePeriod({ year: selectedPeriod.year - 1, month: 11 });
    } else {
      onChangePeriod({ year: selectedPeriod.year, month: selectedPeriod.month - 1 });
    }
  };

  const handleNextMonth = () => {
    if (isAll) {
      onChangePeriod({ year: currentNow.year, month: currentNow.month });
      return;
    }
    if (selectedPeriod.month === 11) {
      onChangePeriod({ year: selectedPeriod.year + 1, month: 0 });
    } else {
      onChangePeriod({ year: selectedPeriod.year, month: selectedPeriod.month + 1 });
    }
  };

  const handleJumpToCurrent = () => {
    onChangePeriod({ year: currentNow.year, month: currentNow.month });
  };

  const handleToggleAll = () => {
    if (isAll) {
      onChangePeriod({ year: currentNow.year, month: currentNow.month });
    } else {
      onChangePeriod('all');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-dark-card border border-white/[0.06] rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
      {!isAll ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5 px-2 font-semibold text-dark-text select-none min-w-[130px] justify-center">
            <Calendar size={13} className="text-brand-400 shrink-0" />
            <span>
              {MONTH_NAMES[selectedPeriod.month]} {selectedPeriod.year}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2 font-semibold text-dark-text select-none">
          <History size={13} className="text-amber-400 shrink-0" />
          <span>Todo o Histórico</span>
        </div>
      )}

      {/* Quick navigation pill to jump to current month */}
      {!isCurrentMonth && !isAll && (
        <button
          type="button"
          onClick={handleJumpToCurrent}
          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 border border-brand-500/20 transition-colors cursor-pointer"
        >
          Mês Atual
        </button>
      )}

      {/* Toggle between Monthly and All History */}
      <button
        type="button"
        onClick={handleToggleAll}
        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
          isAll
            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            : 'text-dark-subtext hover:text-dark-text hover:bg-white/5 border-white/5'
        }`}
        title={isAll ? 'Voltar para visão mensal' : 'Ver todo o histórico acumulado'}
      >
        {isAll ? 'Ver por Mês' : 'Ver Todo o Histórico'}
      </button>
    </div>
  );
});
