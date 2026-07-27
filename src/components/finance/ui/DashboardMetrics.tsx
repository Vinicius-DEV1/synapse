import React from 'react';

interface DashboardMetricsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const DashboardMetrics = React.memo(({ totalIncome, totalExpense, balance }: DashboardMetricsProps) => {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-dark-bg border border-white/5 rounded-xl p-6 flex flex-col gap-2">
        <span className="text-dark-subtext text-sm">Entradas</span>
        <span className="text-3xl font-semibold text-emerald-400">R$ {totalIncome.toFixed(2)}</span>
      </div>
      <div className="bg-dark-bg border border-white/5 rounded-xl p-6 flex flex-col gap-2">
        <span className="text-dark-subtext text-sm">Saídas</span>
        <span className="text-3xl font-semibold text-red-400">R$ {totalExpense.toFixed(2)}</span>
      </div>
      <div className="bg-dark-bg border border-white/5 rounded-xl p-6 flex flex-col gap-2">
        <span className="text-dark-subtext text-sm">Saldo</span>
        <span className={`text-3xl font-semibold ${balance >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
          R$ {balance.toFixed(2)}
        </span>
      </div>
    </div>
  );
});
DashboardMetrics.displayName = 'DashboardMetrics';
