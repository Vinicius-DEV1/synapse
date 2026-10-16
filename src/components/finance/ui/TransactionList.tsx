import React, { useMemo } from 'react';
import { Trash2, ArrowRight, Edit2 } from 'lucide-react';
import type { Transaction, Account } from '../../../types';
import { useTranslation } from '../../../i18n';

const getTypeLabels = (t: (key: string, fallback: string) => string): Record<string, { label: string; color: string }> => ({
  income: { label: t('finance.income', 'Entrada'), color: 'text-emerald-400' },
  expense: { label: t('finance.expense', 'Saída'), color: 'text-red-400' },
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
}

export const TransactionList = React.memo(({
  transactions,
  accounts = [],
  selectedAccountId = 'all',
  onEdit,
  onDelete,
  onPayLoan
}: TransactionListProps) => {
  const { t } = useTranslation();
  const typeLabels = useMemo(() => getTypeLabels(t), [t]);

  const accountsMap = useMemo(() => {
    const map = new Map<string, Account>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter(
      (tx) => (tx.account_id || 'default-wallet') === selectedAccountId || tx.destination_account_id === selectedAccountId
    );
  }, [transactions, selectedAccountId]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const monthYear = formatMonthYearSafe(tx.date);
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  if (filteredTransactions.length === 0) {
    return (
      <div className="text-center text-dark-subtext py-12">
        {t('finance.noTransactions', 'Nenhuma transação encontrada.')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(groupedTransactions).map(([month, monthTxs]) => (
        <div key={month} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-dark-text border-b border-white/5 pb-1.5 flex items-center justify-between">
            <span>{month}</span>
            <span className="text-xs font-normal text-dark-subtext">{monthTxs.length} {monthTxs.length === 1 ? 'item' : 'itens'}</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-dark-subtext text-xs">
                  <th className="py-2 font-medium">{t('finance.date', 'Data')}</th>
                  <th className="py-2 font-medium">{t('finance.description', 'Descrição')}</th>
                  <th className="py-2 font-medium">{t('finance.account', 'Conta')}</th>
                  <th className="py-2 font-medium">{t('finance.category', 'Categoria')}</th>
                  <th className="py-2 font-medium">{t('finance.type', 'Tipo')}</th>
                  <th className="py-2 font-medium text-right">{t('finance.value', 'Valor')}</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm">
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
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 text-dark-subtext text-xs whitespace-nowrap">{formatDateSafe(tx.date)}</td>
                      <td className="py-2.5">
                        <div className="font-medium text-dark-text">{tx.description}</div>
                        {isLoan && (
                          <div className="mt-1 w-40">
                            <div className="flex justify-between text-[11px] text-dark-subtext mb-0.5">
                              <span>{t('finance.paid', 'Pago')}: R$ {paidAmount.toFixed(2)}</span>
                              <span>{tx.is_paid ? t('finance.completed', 'Concluído') : `${progress.toFixed(0)}%`}</span>
                            </div>
                            <div className="h-1.5 w-full bg-dark-bg rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${tx.is_paid ? 'bg-brand-500' : 'bg-brand-500/50'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-dark-subtext">
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
                      <td className="py-2.5 text-dark-subtext">
                        <span className="bg-white/5 text-dark-text px-2 py-0.5 rounded text-xs">
                          {tx.category || 'Geral'}
                        </span>
                      </td>
                      <td className={`py-2.5 ${labelInfo.color} font-medium text-xs`}>{labelInfo.label}</td>
                      <td className={`py-2.5 text-right font-semibold ${
                        isTransfer
                          ? 'text-indigo-400'
                          : tx.type === 'expense' || tx.type === 'loan_made'
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}>
                        {isTransfer ? '⇄' : (tx.type === 'expense' || tx.type === 'loan_made' ? '-' : '+')} R$ {totalAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right flex justify-end gap-1">
                        {isLoan && !tx.is_paid && (
                          <button 
                            onClick={() => onPayLoan(tx)}
                            className="px-2 py-1 text-xs bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 rounded transition-colors"
                          >
                            {t('finance.pay', 'Pagar')}
                          </button>
                        )}
                        {onEdit && (
                          <button 
                            onClick={() => onEdit(tx)}
                            className="p-1 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded transition-colors"
                            title={t('finance.editTransaction', 'Editar Transação')}
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        <button 
                          onClick={() => onDelete(tx.id)}
                          className="p-1 text-dark-subtext hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title={t('finance.delete', 'Excluir')}
                        >
                          <Trash2 size={15} />
                        </button>
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
  );
});
TransactionList.displayName = 'TransactionList';


