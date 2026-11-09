import { useEffect } from 'react';
import { X, Building2, Clock, User } from 'lucide-react';
import type { Transaction, TransactionType, Account } from '../../types';
import { Portal } from '../ui/Portal';
import { CategorySelect } from './ui/CategorySelect';
import { CadernoDatePicker } from './ui/CadernoDatePicker';
import { useTransactionForm } from './hooks/useTransactionForm';
import { useTranslation } from '../../i18n';

interface TransactionModalProps {
  initialData?: Transaction | null;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => Promise<void>;
  defaultType?: TransactionType;
  accounts?: Account[];
  defaultAccountId?: string;
  existingPersons?: string[];
}

export default function TransactionModal({
  initialData,
  onClose,
  onSave,
  defaultType = 'expense',
  accounts = [],
  defaultAccountId,
  existingPersons = [],
}: TransactionModalProps) {
  const { t } = useTranslation();

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
  const {
    type,
    setType,
    amount,
    setAmount,
    expectedAmount,
    setExpectedAmount,
    person,
    setPerson,
    description,
    setDescription,
    category,
    setCategory,
    date,
    setDate,
    dueDate,
    setDueDate,
    accountId,
    setAccountId,
    destinationAccountId,
    setDestinationAccountId,
    loading,
    isLoan,
    isTransfer,
    isPending,
    setIsPending,
    modalTitle,
    handleSubmit,
  } = useTransactionForm({
    initialData,
    onClose,
    onSave,
    defaultType,
    accounts,
    defaultAccountId,
    existingPersons,
  });

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-dark-card border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
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
                className="w-full bg-dark-bg border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none [color-scheme:dark]"
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
                  min="0"
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
                <CadernoDatePicker
                  value={date}
                  onChange={setDate}
                  label="Data"
                  required
                />
              )}
            </div>

            {isLoan && (
              <div className="flex flex-col gap-3">
                {/* Person / Contact field */}
                <div>
                  <label className="block text-xs text-amber-300 font-medium mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="text-amber-400" />
                      {type === 'loan_made'
                        ? 'Para quem você emprestou? (Pessoa / Devedor)'
                        : 'De quem você pegou emprestado? (Pessoa / Credor)'}
                    </span>
                    {existingPersons.length > 0 && (
                      <span className="text-[10px] text-dark-subtext font-normal">
                        Auto-complete ativo
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    list="loan-person-suggestions"
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    placeholder={type === 'loan_made' ? 'Ex: João Silva, Carlos, Maria...' : 'Ex: Tio Pedro, Amigo, Banco...'}
                    className="w-full bg-dark-bg border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-amber-500/70 outline-none"
                    autoFocus={isLoan}
                  />

                  {/* Native Datalist for autocomplete */}
                  {existingPersons.length > 0 && (
                    <datalist id="loan-person-suggestions">
                      {existingPersons.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  )}

                  {/* Quick suggestion pills if empty */}
                  {existingPersons.length > 0 && !person && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-dark-subtext">Sugeridos:</span>
                      {existingPersons.slice(0, 4).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setPerson(name)}
                          className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <User size={10} className="text-amber-400" />
                          <span>{name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Smart match indicator / 1-click completion when typing */}
                  {(() => {
                    if (!person || existingPersons.length === 0) return null;
                    const normalizeKey = (s: string) =>
                      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                    const query = normalizeKey(person);
                    if (!query) return null;

                    const exactMatch = existingPersons.find((p) => normalizeKey(p) === query);
                    if (exactMatch && exactMatch !== person) {
                      return (
                        <p className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
                          <span>Será vinculado ao contato existente: <strong>{exactMatch}</strong></span>
                        </p>
                      );
                    }
                    const partialMatch = existingPersons.find(
                      (p) => normalizeKey(p).startsWith(query) && normalizeKey(p) !== query
                    );
                    if (partialMatch) {
                      return (
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                          <span className="text-[10px] text-dark-subtext">Completar:</span>
                          <button
                            type="button"
                            onClick={() => setPerson(partialMatch)}
                            className="px-1.5 py-0.5 rounded text-[11px] bg-white/5 hover:bg-white/10 text-amber-300 underline underline-offset-2 transition-colors cursor-pointer"
                          >
                            {partialMatch}
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Interest / Expected Amount */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 space-y-1">
                  <label className="block text-xs text-amber-300 font-medium flex items-center justify-between">
                    <span>Valor Total a {type === 'loan_made' ? 'Receber' : 'Pagar'} (com Juros)</span>
                    <span className="text-[10px] text-dark-subtext font-normal">Opcional</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
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
              </div>
            )}

            <div>
              <label className="block text-xs text-dark-subtext mb-1 flex items-center justify-between">
                <span>{isLoan ? 'Descrição / Motivo' : 'Descrição'}</span>
                {isLoan && <span className="text-[10px] text-dark-subtext font-normal">Opcional se preencher pessoa</span>}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isTransfer
                    ? 'Ex: Transferência Nubank para Bradesco'
                    : isLoan
                    ? 'Ex: Ajuda com conserto do carro, Parcela da viagem...'
                    : 'Ex: Supermercado, Aluguel...'
                }
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
                required={!isTransfer && !isLoan}
              />
            </div>

            {!isTransfer && (
              <div className={isLoan ? "grid grid-cols-2 gap-3" : "flex flex-col"}>
                <CadernoDatePicker
                  value={date}
                  onChange={setDate}
                  label="Data"
                  required
                />

                {isLoan && (
                  <CadernoDatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    label="Vencimento"
                    placeholder="Opcional - Sem data"
                    required={false}
                    accentColor="amber"
                  />
                )}
              </div>
            )}

            {!isLoan && !isTransfer && (
              <div className="bg-dark-bg/60 border border-white/5 rounded-lg p-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPending}
                    onChange={(e) => setIsPending(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-dark-bg text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-dark-subtext" />
                      <span className="text-xs font-medium text-dark-text">Transação Futura / Agendada (Pendente)</span>
                    </div>
                    <p className="text-[10px] text-dark-subtext mt-0.5 leading-tight">
                      Não desconta nem soma nenhum centavo no saldo da sua conta até você confirmar a realização. Fica fixada com destaque no topo do extrato.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/5">
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
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50 shadow-md shadow-brand-600/20 active:scale-95 cursor-pointer"
              >
                {loading ? t('common.saving', 'Salvando...') : t('finance.save', 'Salvar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
