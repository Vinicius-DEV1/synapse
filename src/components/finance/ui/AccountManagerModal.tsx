import React, { useState } from 'react';
import { X, Plus, Edit2, Archive, Check, Wallet, Building2, CreditCard } from 'lucide-react';
import type { Account } from '../../../types';
import { Portal } from '../../ui/Portal';
import { triggerToast } from '../../ui/ToastContext';

interface AccountManagerModalProps {
  accounts: Account[];
  onClose: () => void;
  onCreateAccount: (account: Partial<Account>) => Promise<void>;
  onUpdateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
}

const COLOR_PRESETS = [
  { name: 'Roxo (Nubank)', color: '#8a05be' },
  { name: 'Laranja (Inter/Itaú)', color: '#ff5f00' },
  { name: 'Vermelho (Bradesco/Santander)', color: '#dc2626' },
  { name: 'Azul (Caixa/BTG)', color: '#2563eb' },
  { name: 'Amarelo (Banco do Brasil)', color: '#eab308' },
  { name: 'Ciano (Mercado Pago)', color: '#06b6d4' },
  { name: 'Verde (Carteira/Dinheiro)', color: '#10b981' },
  { name: 'Indigo (Investimentos)', color: '#6366f1' },
  { name: 'Cinza / Escuro', color: '#64748b' },
];

export function AccountManagerModal({
  accounts,
  onClose,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
}: AccountManagerModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const startEdit = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setColor(acc.color || '#10b981');
    setInitialBalance(String(acc.initial_balance || 0));
    setIsAddingNew(false);
  };

  const startNew = () => {
    setEditingId(null);
    setName('');
    setColor('#10b981');
    setInitialBalance('');
    setIsAddingNew(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor('#10b981');
    setInitialBalance('');
    setIsAddingNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast('Insira o nome da conta/banco.', 'error');
      return;
    }
    const balanceNum = parseFloat(initialBalance) || 0;

    setLoading(true);
    try {
      if (editingId) {
        await onUpdateAccount(editingId, {
          name: name.trim(),
          color,
          initial_balance: balanceNum,
        });
      } else {
        await onCreateAccount({
          name: name.trim(),
          color,
          icon: 'wallet',
          initial_balance: balanceNum,
        });
      }
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (acc: Account) => {
    if (accounts.length <= 1) {
      triggerToast('Você precisa manter ao menos uma conta cadastrada.', 'error');
      return;
    }
    if (!window.confirm(`Deseja arquivar a conta "${acc.name}"? Ela deixará de aparecer em novas transações, mas seu histórico permanecerá salvo.`)) {
      return;
    }
    await onDeleteAccount(acc.id);
    if (editingId === acc.id) resetForm();
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-brand-500/15 text-brand-400">
                <Building2 size={16} />
              </div>
              <h2 className="text-base font-semibold text-dark-text">Contas & Bancos</h2>
            </div>
            <button onClick={onClose} className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4 overflow-y-auto">
            {/* Accounts List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-dark-subtext uppercase tracking-wider">Suas Contas</span>
                {!isAddingNew && !editingId && (
                  <button
                    onClick={startNew}
                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    <Plus size={13} />
                    <span>Nova Conta</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const isEditing = editingId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                        isEditing
                          ? 'bg-brand-500/10 border-brand-500/30'
                          : 'bg-dark-bg/60 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: acc.color || '#10b981' }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-dark-text truncate">{acc.name}</div>
                          <div className="text-[11px] text-dark-subtext">
                            Saldo Inicial: R$ {Number(acc.initial_balance || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(acc)}
                          className="p-1 text-dark-subtext hover:text-brand-400 rounded hover:bg-white/5 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          className="p-1 text-dark-subtext hover:text-rose-400 rounded hover:bg-white/5 transition-colors"
                          title="Arquivar Conta"
                        >
                          <Archive size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create or Edit Form */}
            {(isAddingNew || editingId) && (
              <form onSubmit={handleSubmit} className="bg-dark-bg/80 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-semibold text-dark-text border-b border-white/5 pb-2">
                  <span>{editingId ? 'Editar Conta' : 'Nova Conta Bancária'}</span>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-dark-subtext hover:text-dark-text text-[11px]"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-dark-subtext mb-1">Nome da Conta / Banco</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú, Carteira..."
                    className="w-full bg-dark-bg border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-dark-subtext mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-dark-bg border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-dark-subtext mb-1.5">Cor de Identificação</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => setColor(preset.color)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                          color === preset.color ? 'scale-110 ring-2 ring-white/50 ring-offset-2 ring-offset-dark-card' : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                      >
                        {color === preset.color && <Check size={11} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50 shadow-md shadow-brand-600/20 active:scale-95"
                  >
                    {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Conta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
