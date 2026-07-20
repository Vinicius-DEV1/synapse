import { useState } from 'react';
import { X } from 'lucide-react';
import type { Transaction } from '../../types';
import { Portal } from '../ui/Portal';

interface TransactionModalProps {
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => Promise<void>;
}

export default function TransactionModal({ onClose, onSave }: TransactionModalProps) {
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    setLoading(true);
    try {
      await onSave({
        type,
        amount: parseFloat(amount),
        description,
        category: 'geral',
        date,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-dark-text">Nova Transação</h2>
          <button onClick={onClose} className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
            >
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
              <option value="loan_made">Emprestei para alguém</option>
              <option value="loan_taken">Peguei emprestado</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Valor</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Salário, Supermercado..."
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
