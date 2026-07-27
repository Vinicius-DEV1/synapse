import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import type { Transaction } from '../../../types';

const typeLabels: Record<string, { label: string, color: string }> = {
  income: { label: 'Entrada', color: 'text-emerald-400' },
  expense: { label: 'Saída', color: 'text-red-400' },
  loan_made: { label: 'Emprestei', color: 'text-amber-400' },
  loan_taken: { label: 'Peguei Emprestado', color: 'text-indigo-400' }
};

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onPayLoan: (tx: Transaction) => void;
}

export const TransactionList = React.memo(({ transactions, onDelete, onPayLoan }: TransactionListProps) => {
  const groupedTransactions = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const date = new Date(tx.date);
      const monthYear = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      if (!acc[capitalizedMonthYear]) acc[capitalizedMonthYear] = [];
      acc[capitalizedMonthYear].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-center text-dark-subtext py-12">
        Nenhuma transação registrada.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(groupedTransactions).map(([month, monthTxs]) => (
        <div key={month} className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-dark-text border-b border-white/5 pb-2">{month}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-dark-subtext text-sm">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Descrição</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium text-right">Valor</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {monthTxs.map(tx => {
                  const isLoan = tx.type === 'loan_made' || tx.type === 'loan_taken';
                  const paidAmount = tx.paid_amount || 0;
                  const progress = isLoan ? Math.min(100, (paidAmount / tx.amount) * 100) : 0;
                  
                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 text-dark-subtext">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3">
                        <div className="font-medium text-dark-text">{tx.description}</div>
                        {isLoan && (
                          <div className="mt-1.5 w-48">
                            <div className="flex justify-between text-xs text-dark-subtext mb-1">
                              <span>Pago: R$ {paidAmount.toFixed(2)}</span>
                              <span>{tx.is_paid ? 'Concluído' : `${progress.toFixed(0)}%`}</span>
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
                      <td className={`py-3 ${typeLabels[tx.type]?.color}`}>{typeLabels[tx.type]?.label}</td>
                      <td className={`py-3 text-right font-medium ${tx.type === 'expense' || tx.type === 'loan_made' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tx.type === 'expense' || tx.type === 'loan_made' ? '-' : '+'} R$ {tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-right flex justify-end gap-1">
                        {isLoan && !tx.is_paid && (
                          <button 
                            onClick={() => onPayLoan(tx)}
                            className="px-2 py-1 text-xs bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 rounded transition-colors"
                          >
                            Pagar
                          </button>
                        )}
                        <button 
                          onClick={() => onDelete(tx.id)}
                          className="p-1.5 text-dark-subtext hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 size={16} />
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
