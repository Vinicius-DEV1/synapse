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
}

export function useTransactionForm({
  initialData,
  onClose,
  onSave,
  defaultType = 'expense',
  accounts = [],
  defaultAccountId,
}: UseTransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || defaultType);
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [expectedAmount, setExpectedAmount] = useState(
    initialData?.expected_amount ? String(initialData.expected_amount) : ''
  );
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

  return {
    type,
    setType,
    amount,
    setAmount,
    expectedAmount,
    setExpectedAmount,
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
    modalTitle,
    handleSubmit,
  };
}
