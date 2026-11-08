import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  ArrowLeftRight,
  Plus,
} from 'lucide-react';
import type { Transaction, Account } from '../../../types';
import { AccountCards } from './AccountCards';
import { useTranslation } from '../../../i18n';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateSafe } from './TransactionList';

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
  onNavigateToTransactions?: () => void;
  onNewTransaction?: () => void;
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
  onNavigateToLoans,
  onNavigateToTransactions,
  onNewTransaction,
}: DashboardMetricsProps) => {
  const { t } = useTranslation();

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

  const accountsMap = React.useMemo(() => {
    const map = new Map<string, Account>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  // Filter transactions for recent list
  const recentTransactions = React.useMemo(() => {
    const filtered = selectedAccountId === 'all'
      ? transactions
      : transactions.filter(
          (t) => (t.account_id || 'default-wallet') === selectedAccountId || t.destination_account_id === selectedAccountId
        );
    return filtered.slice(0, 5);
  }, [transactions, selectedAccountId]);

  return (
    <div className="flex flex-col gap-5">
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
        <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-dark-subtext text-xs mb-2">
            <span className="font-medium">{t('finance.income', 'Entradas')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-[11px] text-dark-subtext/70 mt-1">
              {t('finance.incomeSubtitle', 'Total recebido no período')}
            </p>
          </div>
        </div>

        <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-dark-subtext text-xs mb-2">
            <span className="font-medium">{t('finance.expense', 'Saídas')}</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-400">
              {formatCurrency(totalExpense)}
            </div>
            <p className="text-[11px] text-dark-subtext/70 mt-1">
              {t('finance.expenseSubtitle', 'Total de despesas pagas')}
            </p>
          </div>
        </div>

        <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-dark-subtext text-xs mb-2">
            <span className="font-medium">{t('finance.balance', 'Saldo em Caixa')}</span>
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Wallet size={15} />
            </div>
          </div>
          <div>
            <div className={`text-xl sm:text-2xl font-bold tracking-tight ${balance >= 0 ? 'text-brand-300' : 'text-rose-400'}`}>
              {formatCurrency(balance)}
            </div>
            <p className="text-[11px] text-dark-subtext/70 mt-1">
              {selectedAccountId === 'all'
                ? t('finance.allAccountsBalance', 'Patrimônio líquido consolidado')
                : t('finance.singleAccountBalance', 'Saldo disponível nesta conta')}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Loans & Debt Quick Bar */}
      {(toReceive > 0 || toPay > 0) && (
        <div className="bg-dark-card border border-white/[0.06] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-dark-subtext font-medium">{t('finance.activeLoans', 'Empréstimos Ativos:')}</span>
            {toReceive > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                <ArrowUpRight size={14} />
                {t('finance.toReceive', 'A Receber')}: {formatCurrency(toReceive)}
              </span>
            )}
            {toPay > 0 && (
              <span className="flex items-center gap-1.5 text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                <ArrowDownLeft size={14} />
                {t('finance.toPay', 'A Pagar (Dívidas)')}: {formatCurrency(toPay)}
              </span>
            )}
          </div>

          {onNavigateToLoans && (
            <button
              onClick={onNavigateToLoans}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors self-start sm:self-auto font-medium flex items-center gap-1 cursor-pointer p-1 rounded-md hover:bg-brand-500/10"
            >
              <span>{t('finance.viewLoansDetails', 'Ver detalhes de empréstimos →')}</span>
            </button>
          )}
        </div>
      )}

      {/* Recent Transactions List on Dashboard */}
      <div className="bg-dark-card border border-white/[0.06] rounded-xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
              <ArrowLeftRight size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-dark-text">
                {t('finance.recentTransactions', 'Últimas Movimentações')}
              </h2>
              <p className="text-[11px] text-dark-subtext">
                {selectedAccountId === 'all'
                  ? t('finance.allAccountsRecent', 'Histórico recente de todas as contas')
                  : t('finance.singleAccountRecent', 'Histórico recente desta conta')}
              </p>
            </div>
          </div>

          {onNavigateToTransactions && transactions.length > 0 && (
            <button
              onClick={onNavigateToTransactions}
              className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 cursor-pointer p-1 rounded-lg hover:bg-brand-500/10"
            >
              <span>{t('finance.viewAllTransactions', 'Ver extrato completo →')}</span>
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-dark-subtext">
            <Wallet size={24} className="text-dark-subtext/40 mb-1" />
            <p className="text-xs">{t('finance.noTransactionsYet', 'Nenhuma movimentação registrada ainda.')}</p>
            {onNewTransaction && (
              <button
                onClick={onNewTransaction}
                className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus size={13} />
                <span>{t('finance.newTransaction', 'Nova Transação')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentTransactions.map((tx) => {
              const isTransfer = tx.type === 'transfer';
              const isExpense = tx.type === 'expense' || tx.type === 'loan_made';
              const originAcc = accountsMap.get(tx.account_id || 'default-wallet');
              const destAcc = tx.destination_account_id ? accountsMap.get(tx.destination_account_id) : null;
              const amountNum = Number(tx.amount || 0);

              return (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-dark-text truncate">
                          {tx.description}
                        </span>
                        <span className="text-[10px] bg-white/5 text-dark-subtext px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                          {tx.category || 'Geral'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-dark-subtext mt-0.5">
                        <span>{formatDateSafe(tx.date)}</span>
                        <span>•</span>
                        {isTransfer ? (
                          <span className="flex items-center gap-1">
                            <span>{originAcc?.name || 'Origem'}</span>
                            <ArrowRight size={10} className="text-dark-subtext/70" />
                            <span>{destAcc?.name || 'Destino'}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: originAcc?.color || '#10b981' }}
                            />
                            <span>{originAcc?.name || 'Carteira Principal'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs sm:text-sm font-semibold ${
                        isTransfer
                          ? 'text-indigo-400'
                          : isExpense
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {isTransfer ? '⇄ ' : isExpense ? '- ' : '+ '}
                      {formatCurrency(amountNum)}
                    </span>
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

DashboardMetrics.displayName = 'DashboardMetrics';
