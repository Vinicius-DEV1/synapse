import { useState } from 'react';
import type { Transaction, TransactionType, Account } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

interface UseTransactionFormProps {
  initialData?: Transaction | null;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => Promise<void>;
  defaultType?: TransactionType;
  accounts?: Account[];
  defaultAccountId?: string;
  existingPersons?: string[];
}

export function useTransactionForm({
  initialData,
  onClose,
  onSave,
  defaultType = 'expense',
  accounts = [],
  defaultAccountId,
  existingPersons = [],
}: UseTransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || defaultType);
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [expectedAmount, setExpectedAmount] = useState(
    initialData?.expected_amount ? String(initialData.expected_amount) : ''
  );
  const [person, setPerson] = useState(initialData?.person || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'Geral');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.due_date || '');
  const [isPending, setIsPending] = useState(
    initialData?.status === 'pending' || (initialData?.is_paid === 0 && initialData?.type !== 'loan_made' && initialData?.type !== 'loan_taken')
  );
  const initialOriginId = initialData?.account_id || defaultAccountId || (accounts.length > 0 ? accounts[0].id : 'default-wallet');
  const initialDestId = initialData?.destination_account_id || (
    accounts.find((a) => a.id !== initialOriginId)?.id || (accounts.length > 1 ? accounts[1].id : '')
  );

  const [accountId, setAccountId] = useState<string>(initialOriginId);
  const [destinationAccountId, setDestinationAccountId] = useState<string>(initialDestId);
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
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      triggerToast('Insira um valor numérico válido (maior ou igual a zero).', 'error');
      return;
    }

    const parsedExpectedAmount = isLoan && expectedAmount.trim() ? parseFloat(expectedAmount) : null;
    if (parsedExpectedAmount !== null && (isNaN(parsedExpectedAmount) || parsedExpectedAmount < 0)) {
      triggerToast('O valor total com juros deve ser um número válido (maior ou igual a zero).', 'error');
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

    const trimmedPerson = person.trim();
    // Normalize against existing registered contacts (accent & case-insensitive) to prevent duplicate registrations
    const normalizeKey = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const canonicalPerson = isLoan && trimmedPerson
      ? (existingPersons.find((p) => normalizeKey(p) === normalizeKey(trimmedPerson)) || trimmedPerson)
      : null;
    const finalDescription = description.trim() || (isTransfer ? 'Transferência entre contas' : canonicalPerson || '');
    if (!finalDescription) {
      triggerToast(isLoan ? 'Informe o nome da pessoa ou uma descrição para o empréstimo.' : 'Preencha a descrição da transação.', 'error');
      return;
    }

    setLoading(true);
    try {
      const effectiveIsPaid = isLoan
        ? (initialData?.is_paid !== undefined ? initialData.is_paid : 0)
        : (isPending ? 0 : 1);
      const effectiveStatus = isLoan
        ? (initialData?.status || 'in_progress')
        : (isPending ? 'pending' : 'completed');

      await onSave({
        type,
        amount: parsedAmount,
        expected_amount: parsedExpectedAmount,
        person: canonicalPerson,
        description: finalDescription,
        category: isTransfer ? 'Transferência' : (category.trim() || 'Geral'),
        date,
        due_date: isLoan && dueDate ? dueDate : null,
        account_id: accountId,
        destination_account_id: isTransfer ? destinationAccountId : null,
        is_paid: effectiveIsPaid,
        paid_amount: initialData?.paid_amount !== undefined ? initialData.paid_amount : 0,
        status: effectiveStatus,
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

  return {
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
  };
}
