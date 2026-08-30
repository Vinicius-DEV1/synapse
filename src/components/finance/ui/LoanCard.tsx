import React from 'react';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, RotateCcw, Trash2, CreditCard, AlertTriangle, Clock, Calendar } from 'lucide-react';
import type { Transaction } from '../../../types';
import { formatDateSafe } from './TransactionList';

interface LoanCardProps {
  loan: Transaction;
  onPay: (loan: Transaction) => void;
  onMarkAsPaid: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}

interface DueDateInfo {
  type: 'overdue' | 'today' | 'soon' | 'future';
  label: string;
  className: string;
}

function getDueDateInfo(dueDateStr?: string | null, isPaid?: boolean): DueDateInfo | null {
  if (!dueDateStr || isPaid) return null;
  const parts = dueDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      type: 'overdue',
      label: overdueDays === 1 ? 'Vencido há 1 dia' : `Vencido há ${overdueDays} dias`,
      className: 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-semibold',
    };
  }
  if (diffDays === 0) {
    return {
      type: 'today',
      label: 'Vence hoje!',
      className: 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-semibold',
    };
  }
  if (diffDays <= 3) {
    return {
      type: 'soon',
      label: `Vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-medium',
    };
  }
  return {
    type: 'future',
    label: `Prazo: ${formatDateSafe(dueDateStr)}`,
    className: 'bg-white/5 text-dark-subtext border-white/10',
  };
}

export const LoanCard = React.memo(({
  loan,
  onPay,
  onMarkAsPaid,
  onReopen,
  onDelete
}: LoanCardProps) => {
  const isLoanMade = loan.type === 'loan_made';
  const total = Number(loan.amount || 0);
  const paid = Number(loan.paid_amount || 0);
  const isPaid = Boolean(loan.is_paid) || (total > 0 && paid >= total - 0.001);
  const pending = Math.max(0, total - paid);
  const progress = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
  const dueDateInfo = getDueDateInfo(loan.due_date, isPaid);

  return (
    <div className={`border rounded-xl p-4 transition-all ${
      isPaid
        ? 'bg-dark-bg/40 border-white/5 opacity-80 hover:opacity-100'
        : dueDateInfo?.type === 'overdue'
        ? 'bg-dark-bg/95 border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-950/20'
        : 'bg-dark-bg/90 border-white/10 hover:border-white/20 shadow-lg shadow-black/10'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            isLoanMade
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            {isLoanMade ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
          </div>
          <div>
            <h3 className="font-semibold text-dark-text text-sm sm:text-base">{loan.description}</h3>
            <div className="flex items-center gap-2 text-xs text-dark-subtext mt-0.5">
              <span>{formatDateSafe(loan.date)}</span>
              <span>•</span>
              <span className="bg-white/5 text-dark-text px-1.5 py-0.5 rounded text-[11px]">
                {loan.category || 'Geral'}
              </span>
              <span>•</span>
              <span className={isLoanMade ? 'text-amber-400' : 'text-indigo-400'}>
                {isLoanMade ? 'Emprestei (A Receber)' : 'Peguei Emprestado (Dívida)'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {dueDateInfo && (
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border ${dueDateInfo.className}`}>
              {dueDateInfo.type === 'overdue' ? (
                <AlertTriangle size={12} />
              ) : dueDateInfo.type === 'today' || dueDateInfo.type === 'soon' ? (
                <Clock size={12} />
              ) : (
                <Calendar size={12} />
              )}
              {dueDateInfo.label}
            </span>
          )}

          {isPaid ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
              <CheckCircle2 size={12} />
              Quitado
            </span>
          ) : progress > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-medium">
              Em Andamento ({progress.toFixed(0)}%)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
              Pendente (0%)
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar & Amounts */}
      <div className="bg-black/20 rounded-lg p-3 border border-white/5 mb-3">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-dark-subtext">
            Pago: <strong className="text-dark-text font-semibold">R$ {paid.toFixed(2)}</strong> de R$ {total.toFixed(2)}
          </span>
          <span className="font-semibold">
            {isPaid ? (
              <span className="text-emerald-400">Totalmente Pago</span>
            ) : (
              <span className={isLoanMade ? 'text-amber-400' : 'text-indigo-400'}>
                Restante: R$ {pending.toFixed(2)}
              </span>
            )}
          </span>
        </div>
        <div className="h-2 w-full bg-dark-bg rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isPaid
                ? 'bg-emerald-500'
                : isLoanMade
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          {!isPaid ? (
            <>
              <button
                onClick={() => onPay(loan)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 border border-brand-500/30 rounded-lg transition-colors active:scale-95"
              >
                <CreditCard size={13} />
                <span>Abater Valor</span>
              </button>
              <button
                onClick={() => onMarkAsPaid(loan.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors active:scale-95"
              >
                <CheckCircle2 size={13} />
                <span>Quitar Total</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onReopen(loan.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 text-dark-subtext hover:text-dark-text hover:bg-white/10 rounded-lg transition-colors active:scale-95"
            >
              <RotateCcw size={13} />
              <span>Reabrir Empréstimo</span>
            </button>
          )}
        </div>

        <button
          onClick={() => onDelete(loan.id)}
          className="p-1.5 text-dark-subtext hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          title="Excluir"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
});

LoanCard.displayName = 'LoanCard';

