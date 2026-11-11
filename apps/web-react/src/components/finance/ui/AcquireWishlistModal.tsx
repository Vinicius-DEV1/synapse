import { useState, useEffect } from 'react';
import { X, CheckCircle2, Building2 } from 'lucide-react';
import type { WishlistItem, Account } from '../../../types';
import { Portal } from '../../ui/Portal';
import { triggerToast } from '../../ui/ToastContext';
import { useTranslation } from '../../../i18n';
import { CategorySelect } from './CategorySelect';
import { CadernoDatePicker } from './CadernoDatePicker';

export interface AcquireWishlistModalProps {
  item: WishlistItem;
  accounts: Account[];
  onClose: () => void;
  onConfirm: (data: {
    amount: number;
    accountId: string;
    date: string;
    category: string;
    description: string;
    deleteFromWishlist: boolean;
  }) => Promise<void>;
}

export function AcquireWishlistModal({
  item,
  accounts,
  onClose,
  onConfirm,
}: AcquireWishlistModalProps) {
  const { t } = useTranslation();
  const [description, setDescription] = useState(item.title);
  const [amount, setAmount] = useState(String(item.price || ''));
  const [category, setCategory] = useState(item.category || 'Geral');
  const [accountId, setAccountId] = useState(
    accounts.length > 0 ? accounts[0].id : 'default-wallet'
  );
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deleteFromWishlist, setDeleteFromWishlist] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      triggerToast('Insira um valor válido (maior ou igual a zero).', 'error');
      return;
    }
    if (!description.trim()) {
      triggerToast('Insira a descrição do item adquirido.', 'error');
      return;
    }
    if (!date) {
      triggerToast('Selecione a data de aquisição.', 'error');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        amount: parsedAmount,
        accountId,
        date,
        category: category.trim() || 'Geral',
        description: description.trim(),
        deleteFromWishlist,
      });
      triggerToast('Desejo adquirido e despesa registrada com sucesso!', 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar aquisição.';
      console.error(err);
      triggerToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-dark-card border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-dark-text">
                  Confirmar Aquisição do Desejo
                </h2>
                <p className="text-xs text-dark-subtext">
                  Gera uma despesa no fluxo de caixa e contabiliza o gasto
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
            <div>
              <label className="block text-xs text-dark-subtext mb-1">Descrição da Despesa</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Novo Notebook"
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-subtext mb-1">Valor Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
                  required
                />
              </div>

              <CategorySelect
                value={category}
                onChange={setCategory}
                label="Categoria"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {accounts.length > 0 && (
                <div>
                  <label className="block text-xs text-dark-subtext mb-1 flex items-center gap-1">
                    <Building2 size={12} className="text-brand-400" />
                    <span>Conta / Banco</span>
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
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

              <CadernoDatePicker
                value={date}
                onChange={setDate}
                label="Data da Compra"
                required
              />
            </div>

            {/* Checkbox to remove from wishlist */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteFromWishlist}
                  onChange={(e) => setDeleteFromWishlist(e.target.checked)}
                  className="rounded border-white/20 bg-dark-bg text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
                />
                <span className="text-xs text-dark-subtext">
                  Remover este item da Lista de Desejos após registrar o gasto
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                {loading ? t('common.saving', 'Salvando...') : 'Confirmar Aquisição'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

