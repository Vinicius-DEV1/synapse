import { useState } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Building2 } from 'lucide-react';
import type { Transaction, Account } from '../../types';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';

interface PaymentModalProps {
  transaction: Transaction;
  accounts?: Account[];
  onClose: () => void;
  onSave?: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onPayLoanWithAccount?: (loan: Transaction, amount: number, targetAccountId: string) => Promise<void>;
}

export default function PaymentModal({
  transaction,
  accounts = [],
  onClose,
  onSave,
  onPayLoanWithAccount
}: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [targetAccountId, setTargetAccountId] = useState<string>(
    transaction.account_id || (accounts.length > 0 ? accounts[0].id : 'default-wallet')
  );
  const [loading, setLoading] = useState(false);

  const isLoanMade = transaction.type === 'loan_made';
  const pendingAmount = Math.max(0, transaction.amount - (transaction.paid_amount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerToast('Insira um valor válido e maior que zero.', 'error');
      return;
    }
    if (parsedAmount > pendingAmount + 0.0001) {
      triggerToast(`O valor não pode ultrapassar o saldo pendente (R$ ${pendingAmount.toFixed(2)}).`, 'error');
      return;
    }
    
    setLoading(true);
    try {
      if (onPayLoanWithAccount) {
        await onPayLoanWithAccount(transaction, parsedAmount, targetAccountId);
      } else if (onSave) {
        const newPaidAmount = Math.min(transaction.amount, (transaction.paid_amount || 0) + parsedAmount);
        const updates: Partial<Transaction> = {
          paid_amount: newPaidAmount,
        };
        if (newPaidAmount >= transaction.amount - 0.001) {
          updates.is_paid = 1;
          updates.status = 'completed';
        }
        await onSave(transaction.id, updates);
        triggerToast(isLoanMade ? 'Recebimento registrado com sucesso!' : 'Pagamento registrado com sucesso!', 'success');
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar pagamento.';
      console.error(err);
      triggerToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayFull = () => {
    setAmount(pendingAmount.toFixed(2));
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-3.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${isLoanMade ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                {isLoanMade ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
              </div>
              <h2 className="text-base font-semibold text-dark-text">
                {isLoanMade ? 'Registrar Recebimento' : 'Registrar Pagamento'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
            <div className="bg-dark-bg/80 p-3 rounded-lg border border-white/5">
              <div className="text-xs font-medium text-dark-text mb-1 truncate">{transaction.description}</div>
              <div className="flex justify-between items-end text-xs">
                <div>
                  <span className="text-dark-subtext">Pendente: </span>
                  <span className={`font-semibold ${isLoanMade ? 'text-amber-400' : 'text-indigo-400'}`}>
                    R$ {pendingAmount.toFixed(2)}
                  </span>
                </div>
                <div className="text-dark-subtext">
                  Total: R$ {transaction.amount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Account selection for the payment */}
            {accounts.length > 0 && (
              <div>
                <label className="block text-xs text-dark-subtext mb-1 flex items-center gap-1">
                  <Building2 size={12} className="text-brand-400" />
                  <span>{isLoanMade ? 'Conta de Entrada (Onde você recebeu)' : 'Conta de Saída (De onde você pagou)'}</span>
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-dark-bg text-dark-text">
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-xs text-dark-subtext mb-1">
                {isLoanMade ? 'Valor Recebido' : 'Valor Pago'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext text-xs font-semibold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pendingAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dark-bg border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handlePayFull}
                className="px-2.5 py-1 text-xs text-brand-400 hover:bg-brand-500/10 rounded-md transition-colors font-medium"
              >
                {isLoanMade ? 'Receber Total' : 'Quitar Total'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50 shadow-md shadow-brand-600/20 active:scale-95"
                >
                  {loading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

