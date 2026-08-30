import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
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

  const isExpense = transaction.type === 'expense' || transaction.type === 'loan_made';
  const isTransfer = transaction.type === 'transfer';

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
              <h3 className="text-sm font-semibold text-white">Excluir Transação</h3>
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
            <p className="text-xs text-dark-subtext leading-relaxed">
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </p>

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
