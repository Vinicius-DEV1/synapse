import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Info, RotateCcw } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import type { Transaction } from '../../../types';
import { formatDateSafe } from './TransactionList';

interface DeleteTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void> | void;
}

export const DeleteTransactionModal: React.FC<DeleteTransactionModalProps> = ({
  transaction,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!transaction) return null;

  const isLoan = transaction.type === 'loan_made' || transaction.type === 'loan_taken';
  const isLinkedPayment = Boolean(transaction.linked_loan_id);
  const isTransfer = transaction.type === 'transfer';
  const isExpense = transaction.type === 'expense' || transaction.type === 'loan_made';

  const modalTitle = isLoan
    ? 'Excluir Empréstimo / Dívida'
    : isLinkedPayment
    ? 'Excluir Pagamento de Empréstimo'
    : isTransfer
    ? 'Excluir Transferência'
    : 'Excluir Transação';

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
        <div
          className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-5 w-full max-w-sm animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <AlertTriangle size={17} />
              </div>
              <h3 className="text-sm font-semibold text-white">{modalTitle}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="py-4 space-y-3">
            {isLinkedPayment ? (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                <RotateCcw size={15} className="flex-shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Esta transação é o pagamento de um empréstimo. Ao excluí-la, o valor pago será <strong>estornado</strong> e o saldo pendente do empréstimo será recalculado automaticamente.
                </span>
              </div>
            ) : isLoan ? (
              <p className="text-xs text-dark-subtext leading-relaxed">
                Tem certeza que deseja excluir este registro de empréstimo/dívida? O histórico deste empréstimo será removido.
              </p>
            ) : (
              <p className="text-xs text-dark-subtext leading-relaxed">
                Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
              </p>
            )}

            <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white truncate max-w-[180px]">
                  {transaction.description}
                </span>
                <span
                  className={`font-bold ${
                    isTransfer
                      ? 'text-indigo-400'
                      : isExpense
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {isTransfer ? '⇄ ' : isExpense ? '- ' : '+ '}
                  R$ {Number(transaction.amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-dark-subtext">
                <span>{transaction.category || 'Geral'}</span>
                <span>{formatDateSafe(transaction.date)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                await onConfirm(transaction.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20 active:scale-95"
            >
              <Trash2 size={13} />
              <span>Sim, Excluir</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
