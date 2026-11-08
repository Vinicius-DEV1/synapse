import React, { useState, useMemo, useCallback } from 'react';
import { Trash2, ArrowRight, Edit2, Search, Filter, X, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import type { Transaction, Account } from '../../../types';
import { useTranslation } from '../../../i18n';
import { formatCurrency } from '../utils/formatCurrency';

const getTypeLabels = (t: (key: string, fallback: string) => string): Record<string, { label: string; color: string }> => ({
  income: { label: t('finance.income', 'Entrada'), color: 'text-emerald-400' },
  expense: { label: t('finance.expense', 'Saída'), color: 'text-rose-400' },
  transfer: { label: t('finance.transfer', 'Transferência'), color: 'text-indigo-400' },
  loan_made: { label: t('finance.loanMade', 'Emprestei'), color: 'text-amber-400' },
  loan_taken: { label: t('finance.loanTaken', 'Peguei Emprestado'), color: 'text-indigo-400' }
});

export function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('pt-BR');
}

export function formatMonthYearSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Outros';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const my = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return my.charAt(0).toUpperCase() + my.slice(1);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Outros';
  const my = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return my.charAt(0).toUpperCase() + my.slice(1);
}

interface TransactionListProps {
  transactions: Transaction[];
  accounts?: Account[];
  selectedAccountId?: string | 'all';
  onEdit?: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onPayLoan: (tx: Transaction) => void;
  onConfirmPending?: (tx: Transaction) => void;
  onNewTransaction?: () => void;
}

type FilterType = 'all' | 'income' | 'expense' | 'transfer' | 'loan';

export const TransactionList = React.memo(({
  transactions,
  accounts = [],
  selectedAccountId = 'all',
  onEdit,
  onDelete,
  onPayLoan,
  onConfirmPending,
  onNewTransaction,
}: TransactionListProps) => {
  const { t } = useTranslation();
  const typeLabels = useMemo(() => getTypeLabels(t), [t]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const accountsMap = useMemo(() => {
    const map = new Map<string, Account>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Account filter
      if (selectedAccountId !== 'all') {
        const matchesOrigin = (tx.account_id || 'default-wallet') === selectedAccountId;
        const matchesDest = tx.destination_account_id === selectedAccountId;
        if (!matchesOrigin && !matchesDest) return false;
      }

      // Type filter
      if (filterType !== 'all') {
        if (filterType === 'loan') {
          if (tx.type !== 'loan_made' && tx.type !== 'loan_taken') return false;
        } else if (tx.type !== filterType) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesCat = (tx.category || '').toLowerCase().includes(q);
        const originAcc = accountsMap.get(tx.account_id || 'default-wallet');
        const matchesAcc = (originAcc?.name || '').toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesAcc) return false;
      }

      return true;
    });
  }, [transactions, selectedAccountId, filterType, searchQuery, accountsMap]);

  const isPendingRegularTx = useCallback((t: Transaction) => {
    return (t.type === 'income' || t.type === 'expense' || t.type === 'transfer') &&
      (t.is_paid === 0 || t.status === 'pending');
  }, []);

  const { pendingTransactions, completedTransactions } = useMemo(() => {
    const pending: Transaction[] = [];
    const completed: Transaction[] = [];
    for (const tx of filteredTransactions) {
      if (isPendingRegularTx(tx)) {
        pending.push(tx);
      } else {
        completed.push(tx);
      }
    }
    return { pendingTransactions: pending, completedTransactions: completed };
  }, [filteredTransactions, isPendingRegularTx]);

  const groupedTransactions = useMemo(() => {
    return completedTransactions.reduce((acc, tx) => {
      const monthYear = formatMonthYearSafe(tx.date);
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [completedTransactions]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters Toolbar */}
      <div className="bg-dark-card border border-white/[0.06] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filters */}
          <div className="flex bg-dark-bg/80 p-0.5 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-brand-500/20 text-brand-300 font-medium border border-brand-500/30'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              {t('finance.all', 'Todas')}
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterType === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              {t('finance.income', 'Receitas')}
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterType === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              {t('finance.expense', 'Despesas')}
            </button>
            <button
              onClick={() => setFilterType('transfer')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterType === 'transfer'
                  ? 'bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              {t('finance.transfer', 'Transferências')}
            </button>
            <button
              onClick={() => setFilterType('loan')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                filterType === 'loan'
                  ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              {t('finance.loans', 'Empréstimos')}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:w-56 sm:flex-initial">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-subtext" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('finance.searchTransactions', 'Buscar transações...')}
            className="w-full bg-dark-bg/80 border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-subtext hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Transaction Groups / List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-dark-card border border-white/[0.06] rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-2 shadow-sm">
          <Filter size={24} className="text-dark-subtext/40 mb-1" />
          <p className="text-sm font-medium text-dark-text">
            {t('finance.noTransactions', 'Nenhuma transação encontrada.')}
          </p>
          <p className="text-xs text-dark-subtext">
            {searchQuery || filterType !== 'all' || selectedAccountId !== 'all'
              ? 'Tente ajustar os filtros ou termo de busca.'
              : 'Registre sua primeira movimentação financeira.'}
          </p>
          {onNewTransaction && !searchQuery && filterType === 'all' && (
            <button
              onClick={onNewTransaction}
              className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {t('finance.newTransaction', 'Nova Transação')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Pinned Future / Pending Transactions */}
          {pendingTransactions.length > 0 && (
            <div className="bg-dark-card/90 border border-amber-500/20 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-amber-400" />
                  <h3 className="text-xs font-semibold text-dark-text uppercase tracking-wider">
                    Transações Futuras / Pendentes ({pendingTransactions.length})
                  </h3>
                </div>
                <span className="text-[11px] text-dark-subtext">
                  Não descontam do saldo até serem confirmadas
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {pendingTransactions.map((tx) => {
                  const account = accountsMap.get(tx.account_id || 'default-wallet');
                  return (
                    <div
                      key={tx.id}
                      className="bg-dark-bg/60 border border-dashed border-white/10 hover:border-white/20 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-xs text-dark-subtext whitespace-nowrap font-mono">
                          {formatDateSafe(tx.date)}
                        </span>
                        <span className="text-xs font-medium text-dark-text truncate" title={tx.description}>
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-dark-subtext bg-white/5 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">
                          {tx.category || 'Geral'}
                        </span>
                        {account && (
                          <span className="text-[10px] text-dark-subtext/80 bg-white/5 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {account.name}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                          Pendente
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-dark-subtext whitespace-nowrap">
                          {formatCurrency(Number(tx.amount || 0))}
                        </span>

                        {onConfirmPending && (
                          <button
                            onClick={() => onConfirmPending(tx)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer active:scale-95"
                            title="Efetivar e descontar/creditar do saldo"
                          >
                            <CheckCircle2 size={13} />
                            <span>Efetivar</span>
                          </button>
                        )}

                        {onEdit && (
                          <button
                            onClick={() => onEdit(tx)}
                            className="p-1 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => onDelete(tx.id)}
                          className="p-1 text-dark-subtext hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.entries(groupedTransactions).map(([month, monthTxs]) => (
            <div key={month} className="bg-dark-card border border-white/[0.06] rounded-xl p-4 sm:p-5 flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-sm font-semibold text-dark-text tracking-tight">{month}</h3>
                <span className="text-xs font-normal text-dark-subtext">
                  {monthTxs.length} {monthTxs.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-dark-subtext text-xs">
                      <th className="py-2 px-2 font-medium">{t('finance.date', 'Data')}</th>
                      <th className="py-2 px-2 font-medium">{t('finance.description', 'Descrição')}</th>
                      <th className="py-2 px-2 font-medium">{t('finance.account', 'Conta')}</th>
                      <th className="py-2 px-2 font-medium">{t('finance.category', 'Categoria')}</th>
                      <th className="py-2 px-2 font-medium">{t('finance.type', 'Tipo')}</th>
                      <th className="py-2 px-2 font-medium text-right">{t('finance.value', 'Valor')}</th>
                      <th className="py-2 px-2 font-medium w-24 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm divide-y divide-white/[0.03]">
                    {monthTxs.map((tx) => {
                      const isLoan = tx.type === 'loan_made' || tx.type === 'loan_taken';
                      const isTransfer = tx.type === 'transfer';
                      const paidAmount = Number(tx.paid_amount || 0);
                      const totalAmount = Number(tx.amount || 0);
                      const progress = isLoan && totalAmount > 0 ? Math.min(100, Math.max(0, (paidAmount / totalAmount) * 100)) : 0;
                      const labelInfo = typeLabels[tx.type] || { label: tx.type || 'Transação', color: 'text-dark-text' };

                      const originAcc = accountsMap.get(tx.account_id || 'default-wallet');
                      const destAcc = tx.destination_account_id ? accountsMap.get(tx.destination_account_id) : null;

                      return (
                        <tr key={tx.id} className="hover:bg-white/[0.02] group transition-colors">
                          <td className="py-2.5 px-2 text-dark-subtext text-xs whitespace-nowrap">
                            {formatDateSafe(tx.date)}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="font-medium text-dark-text">{tx.description}</div>
                            {isLoan && (
                              <div className="mt-1 w-36 sm:w-44">
                                <div className="flex justify-between text-[11px] text-dark-subtext mb-0.5">
                                  <span>{t('finance.paid', 'Pago')}: {formatCurrency(paidAmount)}</span>
                                  <span>{tx.is_paid ? t('finance.completed', 'Quitado') : `${progress.toFixed(0)}%`}</span>
                                </div>
                                <div className="h-1.5 w-full bg-dark-bg rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className={`h-full rounded-full transition-all ${tx.is_paid ? 'bg-emerald-500' : 'bg-brand-500'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-dark-subtext">
                            {isTransfer ? (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="font-medium text-dark-text">{originAcc?.name || 'Origem'}</span>
                                <ArrowRight size={11} className="text-dark-subtext" />
                                <span className="font-medium text-dark-text">{destAcc?.name || 'Destino'}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: originAcc?.color || '#10b981' }}
                                />
                                <span className="text-dark-text truncate max-w-[120px]">{originAcc?.name || 'Carteira Principal'}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-dark-subtext">
                            <span className="bg-white/5 text-dark-text px-2 py-0.5 rounded text-xs border border-white/5">
                              {tx.category || 'Geral'}
                            </span>
                          </td>
                          <td className={`py-2.5 px-2 ${labelInfo.color} font-medium text-xs whitespace-nowrap`}>
                            {labelInfo.label}
                          </td>
                          <td className={`py-2.5 px-2 text-right font-semibold whitespace-nowrap ${
                            isTransfer
                              ? 'text-indigo-400'
                              : tx.type === 'expense' || tx.type === 'loan_made'
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}>
                            {isTransfer ? '⇄ ' : (tx.type === 'expense' || tx.type === 'loan_made' ? '- ' : '+ ')}
                            {formatCurrency(totalAmount)}
                          </td>
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {isLoan && !tx.is_paid && (
                                <button
                                  onClick={() => onPayLoan(tx)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 border border-brand-500/30 rounded-lg transition-colors cursor-pointer"
                                  title={t('finance.pay', 'Abater valor')}
                                >
                                  <CreditCard size={12} />
                                  <span>{t('finance.pay', 'Pagar')}</span>
                                </button>
                              )}
                              {onEdit && (
                                <button
                                  onClick={() => onEdit(tx)}
                                  className="p-1.5 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                                  title={t('finance.editTransaction', 'Editar Transação')}
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => onDelete(tx.id)}
                                className="p-1.5 text-dark-subtext hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                                title={t('finance.delete', 'Excluir')}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

TransactionList.displayName = 'TransactionList';
