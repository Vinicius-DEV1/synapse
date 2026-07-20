import { useState } from 'react';
import { X } from 'lucide-react';
import type { Transaction } from '../../types';
import { Portal } from '../ui/Portal';

interface PaymentModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export default function PaymentModal({ transaction, onClose, onSave }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const pendingAmount = transaction.amount - (transaction.paid_amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    
    setLoading(true);
    try {
      const newPaidAmount = (transaction.paid_amount || 0) + parsedAmount;
      const updates: Partial<Transaction> = {
        paid_amount: newPaidAmount,
      };
      
      if (newPaidAmount >= transaction.amount) {
        updates.is_paid = 1;
      }
      
      await onSave(transaction.id, updates);
      onClose();
    } catch (err) {
      console.error(err);
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
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-dark-text">Registrar Pagamento</h2>
          <button onClick={onClose} className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="bg-dark-bg p-3 rounded-lg border border-white/5">
            <div className="text-sm text-dark-subtext mb-1">{transaction.description}</div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs text-dark-subtext">Pendente: </span>
                <span className="text-brand-400 font-semibold">R$ {pendingAmount.toFixed(2)}</span>
              </div>
              <div className="text-xs text-dark-subtext">
                Total: R$ {transaction.amount.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Valor Pago</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext text-sm">R$</span>
              <input
                type="number"
                step="0.01"
                max={pendingAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-dark-bg border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handlePayFull}
              className="px-3 py-1.5 text-xs text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
            >
              Pagar Total
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-dark-subtext hover:text-dark-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
