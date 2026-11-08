import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Scale, CheckCircle2 } from 'lucide-react';
import type { Transaction } from '../../../types';
import { formatCurrency, formatSignedCurrency } from '../utils/formatCurrency';

interface LoanSummaryCardsProps {
  loans: Transaction[];
}

export const LoanSummaryCards = React.memo(({ loans }: LoanSummaryCardsProps) => {
  const { toReceive, toPay, netBalance, activeCount, completedCount } = React.useMemo(() => {
    let recCents = 0;
    let payCents = 0;
    let active = 0;
    let completed = 0;

    for (const loan of loans) {
      const totalCents = Math.round(Number(loan.expected_amount || loan.amount || 0) * 100);
      const paidCents = Math.round(Number(loan.paid_amount || 0) * 100);
      const isPaid = Boolean(loan.is_paid) || (totalCents > 0 && paidCents >= totalCents);
      const pendingCents = Math.max(0, totalCents - paidCents);

      if (isPaid) {
        completed++;
      } else {
        active++;
        if (loan.type === 'loan_made') {
          recCents += pendingCents;
        } else if (loan.type === 'loan_taken') {
          payCents += pendingCents;
        }
      }
    }

    const rec = recCents / 100;
    const pay = payCents / 100;

    return {
      toReceive: rec,
      toPay: pay,
      netBalance: (recCents - payCents) / 100,
      activeCount: active,
      completedCount: completed,
    };
  }, [loans]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors shadow-sm">
        <div className="flex items-center justify-between text-dark-subtext text-xs mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <ArrowUpRight size={14} className="text-amber-400" />
            A Receber (Ativos)
          </span>
          <span className="text-[11px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-medium border border-amber-500/20">
            Emprestei
          </span>
        </div>
        <div className="text-xl font-bold tracking-tight text-amber-400">
          {formatCurrency(toReceive)}
        </div>
      </div>

      <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors shadow-sm">
        <div className="flex items-center justify-between text-dark-subtext text-xs mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <ArrowDownLeft size={14} className="text-indigo-400" />
            A Pagar (Dívidas)
          </span>
          <span className="text-[11px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-medium border border-indigo-500/20">
            Peguei
          </span>
        </div>
        <div className="text-xl font-bold tracking-tight text-indigo-400">
          {formatCurrency(toPay)}
        </div>
      </div>

      <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors shadow-sm">
        <div className="flex items-center justify-between text-dark-subtext text-xs mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Scale size={14} className="text-brand-400" />
            Saldo Líquido
          </span>
          <span className="text-[11px] text-dark-subtext/70">Diferença</span>
        </div>
        <div
          className={`text-xl font-bold tracking-tight ${
            netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {formatSignedCurrency(netBalance, true)}
        </div>
      </div>

      <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors shadow-sm">
        <div className="flex items-center justify-between text-dark-subtext text-xs mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Status Geral
          </span>
          <span className="text-[11px] text-dark-subtext/70">{loans.length} total</span>
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
