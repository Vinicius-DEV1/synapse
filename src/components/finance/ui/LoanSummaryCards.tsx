import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Scale, CheckCircle2 } from 'lucide-react';
import type { Transaction } from '../../../types';

interface LoanSummaryCardsProps {
  loans: Transaction[];
}

export const LoanSummaryCards = React.memo(({ loans }: LoanSummaryCardsProps) => {
  const { toReceive, toPay, netBalance, activeCount, completedCount } = React.useMemo(() => {
    let rec = 0;
    let pay = 0;
    let active = 0;
    let completed = 0;

    for (const loan of loans) {
      const isPaid = Boolean(loan.is_paid);
      const total = Number(loan.amount || 0);
      const paid = Number(loan.paid_amount || 0);
      const pending = Math.max(0, total - paid);

      if (isPaid) {
        completed++;
      } else {
        active++;
        if (loan.type === 'loan_made') {
          rec += pending;
        } else if (loan.type === 'loan_taken') {
          pay += pending;
        }
      }
    }

    return {
      toReceive: rec,
      toPay: pay,
      netBalance: rec - pay,
      activeCount: active,
      completedCount: completed,
    };
  }, [loans]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5 hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between text-dark-subtext text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <ArrowUpRight size={14} className="text-amber-400" />
            A Receber (Ativos)
          </span>
          <span className="text-[11px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-mono">
            Emprestei
          </span>
        </div>
        <div className="text-xl font-bold text-amber-400">
          R$ {toReceive.toFixed(2)}
        </div>
      </div>

      <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5 hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between text-dark-subtext text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <ArrowDownLeft size={14} className="text-indigo-400" />
            A Pagar (Dívidas)
          </span>
          <span className="text-[11px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-mono">
            Peguei
          </span>
        </div>
        <div className="text-xl font-bold text-indigo-400">
          R$ {toPay.toFixed(2)}
        </div>
      </div>

      <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5 hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between text-dark-subtext text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Scale size={14} className="text-brand-400" />
            Saldo Líquido
          </span>
          <span className="text-[11px] text-dark-subtext">Diferença</span>
        </div>
        <div
          className={`text-xl font-bold ${
            netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {netBalance >= 0 ? '+' : ''} R$ {netBalance.toFixed(2)}
        </div>
      </div>

      <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5 hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between text-dark-subtext text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Status Geral
          </span>
          <span className="text-[11px] text-dark-subtext">{loans.length} total</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="text-amber-400">{activeCount} ativos</span>
          <span className="text-white/20">•</span>
          <span className="text-emerald-400">{completedCount} quitados</span>
        </div>
      </div>
    </div>
  );
});

LoanSummaryCards.displayName = 'LoanSummaryCards';
