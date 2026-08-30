import React from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Transaction, Account } from '../../../types';
import { AccountCards } from './AccountCards';

interface DashboardMetricsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  loans?: Transaction[];
  accounts?: Account[];
  transactions?: Transaction[];
  selectedAccountId?: string | 'all';
  onSelectAccount?: (id: string | 'all') => void;
  onOpenAccountManager?: () => void;
  onNavigateToLoans?: () => void;
}

export const DashboardMetrics = React.memo(({
  totalIncome,
  totalExpense,
  balance,
  loans = [],
  accounts = [],
  transactions = [],
  selectedAccountId = 'all',
  onSelectAccount,
  onOpenAccountManager,
  onNavigateToLoans
}: DashboardMetricsProps) => {
  const { toReceive, toPay } = React.useMemo(() => {
    let rec = 0;
    let pay = 0;
    for (const loan of loans) {
      if (!loan.is_paid) {
        const pending = Math.max(0, Number(loan.amount || 0) - Number(loan.paid_amount || 0));
        if (loan.type === 'loan_made') rec += pending;
        if (loan.type === 'loan_taken') pay += pending;
      }
    }
    return { toReceive: rec, toPay: pay };
  }, [loans]);

  return (
    <div className="flex flex-col gap-4">
      {/* Accounts & Wallets Carousel / Grid */}
      {accounts.length > 0 && onSelectAccount && onOpenAccountManager && (
        <AccountCards
          accounts={accounts}
          transactions={transactions}
          selectedAccountId={selectedAccountId}
          onSelectAccount={onSelectAccount}
          onOpenAccountManager={onOpenAccountManager}
        />
      )}
      {/* Primary Cashflow Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-4 flex flex-col gap-1 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-dark-subtext text-xs">
            <span className="font-medium">Entradas</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            R$ {totalIncome.toFixed(2)}
          </div>
        </div>

        <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-4 flex flex-col gap-1 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-dark-subtext text-xs">
            <span className="font-medium">Saídas</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            R$ {totalExpense.toFixed(2)}
          </div>
        </div>

        <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-4 flex flex-col gap-1 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-dark-subtext text-xs">
            <span className="font-medium">Saldo em Caixa</span>
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
              <Wallet size={15} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${balance >= 0 ? 'text-brand-400' : 'text-rose-400'}`}>
            R$ {balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Secondary Loans & Debt Quick Bar */}
      {(toReceive > 0 || toPay > 0) && (
        <div className="bg-dark-bg/50 border border-white/5 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-dark-subtext font-medium">Empréstimos Ativos:</span>
            {toReceive > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <ArrowUpRight size={14} />
                A Receber: R$ {toReceive.toFixed(2)}
              </span>
            )}
            {toPay > 0 && (
              <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <ArrowDownLeft size={14} />
                A Pagar (Dívidas): R$ {toPay.toFixed(2)}
              </span>
            )}
          </div>

          {onNavigateToLoans && (
            <button
              onClick={onNavigateToLoans}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors self-start sm:self-auto font-medium"
            >
              Ver detalhes de empréstimos →
            </button>
          )}
        </div>
      )}
    </div>
  );
});

DashboardMetrics.displayName = 'DashboardMetrics';

