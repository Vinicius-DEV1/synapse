import { useCallback } from 'react';
import type { Account } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

export interface UseFinanceAccountsProps {
  loadData: () => Promise<void>;
}

export function useFinanceAccounts({ loadData }: UseFinanceAccountsProps) {
  const createAccount = useCallback(async (account: Partial<Account>) => {
    if (!window.api?.finance?.createAccount) return;
    try {
      await window.api.finance.createAccount(account);
      triggerToast('Conta cadastrada com sucesso!', 'success');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao cadastrar conta:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar conta';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    if (!window.api?.finance?.updateAccount) return;
    try {
      await window.api.finance.updateAccount(id, updates);
      triggerToast('Conta atualizada com sucesso!', 'success');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao atualizar conta:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar conta';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!window.api?.finance?.deleteAccount) return;
    try {
      await window.api.finance.deleteAccount(id);
      triggerToast('Conta arquivada com sucesso.', 'info');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao arquivar conta:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao arquivar conta';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  return {
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
