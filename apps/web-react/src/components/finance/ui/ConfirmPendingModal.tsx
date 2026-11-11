import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Building2, AlertCircle, TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react';
import type { Transaction, Account } from '../../../types';
import { Portal } from '../../ui/Portal';
import { CadernoDatePicker } from './CadernoDatePicker';
import { CategorySelect } from './CategorySelect';
import { useTranslation } from '../../../i18n';

export interface ConfirmPendingModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  accounts: Account[];
  onClose: () => void;
  onConfirm: (
    txId: string,
    updatedData: {
      amount: number;
      date: string;
      accountId: string;
      description: string;
      category: string;
    }
  ) => Promise<void>;
}

export function ConfirmPendingModal({
  isOpen,
  transaction,
  accounts,
  onClose,
  onConfirm,
}: ConfirmPendingModalProps) {
  const { t } = useTranslation();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Geral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) return;
    setAmount(String(transaction.amount ?? ''));
    // Default to today if date is missing or prefill with transaction date
    const todayStr = new Date().toISOString().split('T')[0];
    setDate(transaction.date || todayStr);
    setAccountId(transaction.account_id || (accounts[0]?.id ?? 'default-wallet'));
    setDescription(transaction.description || '');
    setCategory(transaction.category || 'Geral');
    setErrorMsg(null);
  }, [transaction, accounts, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        onClose();
      }
    };

    const handleBackPress = (e: Event) => {
      e.preventDefault();
      if (!isSubmitting) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !transaction) return null;

  const isExpense = transaction.type === 'expense' || transaction.type === 'loan_made';
  const isIncome = transaction.type === 'income' || transaction.type === 'loan_taken';
  const isTransfer = transaction.type === 'transfer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg('Informe um valor final válido (maior ou igual a zero).');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Informe uma descrição para a transação.');
      return;
    }

    if (!date) {
      setErrorMsg('Selecione a data de efetivação.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirm(transaction.id, {
        amount: parsedAmount,
        date,
        accountId: accountId || (accounts[0]?.id ?? 'default-wallet'),
        description: description.trim(),
        category,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao efetivar a transação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-dark-card border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-dark-text">Efetivar Transação</h2>
                <p className="text-[11px] text-dark-subtext">Confira e ajuste os dados antes de debitar no saldo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Type indicator badge */}
            <div className="flex items-center justify-between bg-dark-bg/60 p-2.5 rounded-lg border border-white/5">
              <span className="text-xs text-dark-subtext font-medium">Natureza da Operação:</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                  isExpense
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : isIncome
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {isExpense && <TrendingDown size={12} />}
                {isIncome && <TrendingUp size={12} />}
                {isTransfer && <ArrowLeftRight size={12} />}
                <span>
                  {isExpense
                    ? 'Saída (Despesa Realizada)'
                    : isIncome
                    ? 'Entrada (Receita Realizada)'
                    : 'Transferência Realizada'}
                </span>
              </span>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-dark-subtext mb-1 font-medium">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, Consulta Médica..."
                disabled={isSubmitting}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-emerald-500/50 outline-none"
              />
            </div>

            {/* Amount and Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-subtext mb-1 font-medium">Valor Final (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  disabled={isSubmitting}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-emerald-500/50 outline-none font-semibold text-emerald-300"
                />
              </div>

              <div>
                <CategorySelect
                  value={category}
                  onChange={setCategory}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Date with CadernoDatePicker */}
            <div>
              <CadernoDatePicker
                label="Data da Efetivação"
                value={date}
                onChange={setDate}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Account Selector */}
            {accounts.length > 0 && !isTransfer && (
              <div>
                <label className="block text-xs text-dark-subtext mb-1 font-medium flex items-center gap-1">
                  <Building2 size={12} className="text-brand-400" />
                  <span>Conta para Débito/Crédito</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  disabled={isSubmitting}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-emerald-500/50 outline-none [color-scheme:dark]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-dark-bg text-dark-text">
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5 mt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>{isSubmitting ? 'Efetivando...' : 'Confirmar e Efetivar'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

