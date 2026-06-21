import { useState } from 'react';
import { X } from 'lucide-react';
import type { WishlistItem } from '../../types';

interface WishlistModalProps {
  onClose: () => void;
  onSave: (item: Partial<WishlistItem>) => Promise<void>;
}

export default function WishlistModal({ onClose, onSave }: WishlistModalProps) {
  const [title, setTitle] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [priority, setPriority] = useState<WishlistItem['priority']>('medium');
  const [expectedDate, setExpectedDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !estimatedCost) return;
    
    setLoading(true);
    try {
      await onSave({
        title,
        estimated_cost: parseFloat(estimatedCost),
        priority,
        expected_date: expectedDate || null,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-dark-text">Novo Desejo / Gasto Futuro</h2>
          <button onClick={onClose} className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">O que você deseja comprar/pagar?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Novo Notebook, Viagem..."
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Custo Estimado</label>
            <input
              type="number"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">Data Esperada (Opcional)</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
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
  );
}
