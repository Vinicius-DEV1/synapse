import { useState } from 'react';
import { X, Calendar, Building2 } from 'lucide-react';
import type { Transaction, TransactionType, Account } from '../../types';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';
import { formatDateSafe } from './ui/TransactionList';
import { CategorySelect } from './ui/CategorySelect';

interface TransactionModalProps {
  initialData?: Transaction | null;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => Promise<void>;
  defaultType?: TransactionType;
  accounts?: Account[];
  defaultAccountId?: string;
}

export default function TransactionModal({
  initialData,
  onClose,
  onSave,
  defaultType = 'expense',
  accounts = [],
  defaultAccountId
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || defaultType);
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [expectedAmount, setExpectedAmount] = useState(initialData?.expected_amount ? String(initialData.expected_amount) : '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'Geral');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.due_date || '');
  const [accountId, setAccountId] = useState<string>(
    initialData?.account_id || defaultAccountId || (accounts.length > 0 ? accounts[0].id : 'default-wallet')
  );
  const [destinationAccountId, setDestinationAccountId] = useState<string>(
    initialData?.destination_account_id || (accounts.length > 1 ? accounts[1].id : '')
  );
  const [loading, setLoading] = useState(false);

  const isLoan = type === 'loan_made' || type === 'loan_taken';
  const isTransfer = type === 'transfer';
  const isEditing = Boolean(initialData);

  const modalTitle = isEditing
    ? isLoan
      ? 'Editar Empréstimo / Dívida'
      : isTransfer
      ? 'Editar Transferência'
      : 'Editar Transação'
    : 'Nova Transação';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerToast('Insira um valor numérico válido e maior que zero.', 'error');
      return;
    }

    const parsedExpectedAmount = isLoan && expectedAmount.trim() ? parseFloat(expectedAmount) : null;
    if (parsedExpectedAmount !== null && (isNaN(parsedExpectedAmount) || parsedExpectedAmount <= 0)) {
      triggerToast('O valor total com juros deve ser um número válido.', 'error');
      return;
    }

    if (isLoan && isEditing) {
      const alreadyPaid = Number(initialData?.paid_amount || 0);
      const effectiveTotal = parsedExpectedAmount !== null ? parsedExpectedAmount : parsedAmount;
      if (alreadyPaid > 0 && effectiveTotal < alreadyPaid - 0.001) {
        triggerToast(`O valor total não pode ser menor que o valor já pago (R$ ${alreadyPaid.toFixed(2)}).`, 'error');
        return;
      }
    }

    if (isTransfer) {
      if (!accountId || !destinationAccountId) {
        triggerToast('Selecione as contas de origem e destino.', 'error');
        return;
      }
      if (accountId === destinationAccountId) {
        triggerToast('A conta de origem e destino não podem ser iguais.', 'error');
        return;
      }
    }

    const finalDescription = description.trim() || (isTransfer ? 'Transferência entre contas' : '');
    if (!finalDescription) {
      triggerToast('Preencha a descrição da transação.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await onSave({
        type,
        amount: parsedAmount,
        expected_amount: parsedExpectedAmount,
        description: finalDescription,
        category: isTransfer ? 'Transferência' : (category.trim() || 'Geral'),
        date,
        due_date: isLoan && dueDate ? dueDate : null,
        account_id: accountId,
        destination_account_id: isTransfer ? destinationAccountId : null,
        is_paid: initialData?.is_paid !== undefined ? initialData.is_paid : (isLoan ? 0 : 1),
        paid_amount: initialData?.paid_amount !== undefined ? initialData.paid_amount : 0,
        status: initialData?.status || (isLoan ? 'in_progress' : 'completed'),
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar transação.';
      console.error(err);
      triggerToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-3.5 border-b border-white/5">
            <h2 className="text-base font-semibold text-dark-text">{modalTitle}</h2>
            <button onClick={onClose} className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
            <div>
              <label className="block text-xs text-dark-subtext mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
              >
                <option className="bg-dark-bg text-dark-text" value="income">Entrada (Receita)</option>
                <option className="bg-dark-bg text-dark-text" value="expense">Saída (Despesa)</option>
                <option className="bg-dark-bg text-dark-text" value="transfer">Transferência entre Contas</option>
                <option className="bg-dark-bg text-dark-text" value="loan_made">Emprestei para alguém</option>
                <option className="bg-dark-bg text-dark-text" value="loan_taken">Peguei emprestado</option>
              </select>
            </div>

            {/* Account Selector */}
            {accounts.length > 0 && !isTransfer && (
              <div>
                <label className="block text-xs text-dark-subtext mb-1 flex items-center gap-1">
                  <Building2 size={12} className="text-brand-400" />
                  <span>Conta / Banco</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-dark-bg text-dark-text">
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Transfer source and destination selectors */}
            {isTransfer && (
              <div className="grid grid-cols-2 gap-3 bg-dark-bg/60 p-3 rounded-lg border border-white/5">
                <div>
                  <label className="block text-xs text-dark-subtext mb-1 font-medium">Conta Origem (Sai)</label>
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

                <div>
                  <label className="block text-xs text-dark-subtext mb-1 font-medium">Conta Destino (Entra)</label>
                  <select
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-dark-bg border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
                  >
                    <option value="" disabled className="bg-dark-bg text-dark-subtext">Selecione o destino</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-dark-bg text-dark-text">
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-subtext mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
                  required
                />
              </div>

              {!isTransfer ? (
                <CategorySelect
                  value={category}
                  onChange={setCategory}
                  label="Categoria"
                />
              ) : (
                <div>
                  <label className="block text-xs text-dark-subtext mb-1 flex items-center justify-between">
                    <span>Data</span>
                    {date && <span className="text-[11px] text-brand-400 font-medium">{formatDateSafe(date)}</span>}
                  </label>
                  <input
                    type="date"
                    lang="pt-BR"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
                    required
                  />
                </div>
              )}
            </div>

            {isLoan && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 space-y-1">
                <label className="block text-xs text-amber-300 font-medium flex items-center justify-between">
                  <span>Valor Total a {type === 'loan_made' ? 'Receber' : 'Pagar'} (com Juros)</span>
                  <span className="text-[10px] text-dark-subtext font-normal">Opcional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  placeholder={`Ex: ${amount ? (parseFloat(amount) * 1.1).toFixed(2) : '600.00'}`}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-amber-500/50 outline-none"
                />
                <p className="text-[10px] text-dark-subtext leading-tight">
                  {type === 'loan_made'
                    ? 'Preencha caso tenha emprestado um valor e combinou de receber um total maior com juros.'
                    : 'Preencha caso tenha pegado emprestado e precisará pagar um valor maior com juros.'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs text-dark-subtext mb-1">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isTransfer ? "Ex: Transferência Nubank para Bradesco" : "Ex: Supermercado, Empréstimo..."}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
                required={!isTransfer}
              />
            </div>

            {!isTransfer && (
              <div className={isLoan ? "grid grid-cols-2 gap-3" : "flex flex-col"}>
                <div>
                  <label className="block text-xs text-dark-subtext mb-1 flex items-center justify-between">
                    <span>Data</span>
                    {date && <span className="text-[11px] text-brand-400 font-medium">{formatDateSafe(date)}</span>}
                  </label>
                  <input
                    type="date"
                    lang="pt-BR"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
                    required
                  />
                </div>

                {isLoan && (
                  <div>
                    <label className="block text-xs text-dark-subtext mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-amber-400" />
                        <span>Vencimento</span>
                      </span>
                      {dueDate && <span className="text-[11px] text-amber-400 font-medium">{formatDateSafe(dueDate)}</span>}
                    </label>
                    <input
                      type="date"
                      lang="pt-BR"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
                      placeholder="Opcional"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50 shadow-md shadow-brand-600/20 active:scale-95"
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
