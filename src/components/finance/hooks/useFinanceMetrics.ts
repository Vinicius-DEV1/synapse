import { useMemo } from 'react';
import type { Transaction, Account } from '../../../types';
import { calculateAccountBalance } from '../ui/AccountCards';

export interface UseFinanceMetricsProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedAccountId: string | 'all';
}

export interface FinanceMetricsResult {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  loansList: Transaction[];
  regularTransactions: Transaction[];
}

/**
 * Calculates aggregated financial totals, account balances, and categorized transaction lists.
 */
export function useFinanceMetrics({
  transactions,
  accounts,
  selectedAccountId,
}: UseFinanceMetricsProps): FinanceMetricsResult {
  return useMemo(() => {
    let inc = 0;
    let exp = 0;

    const filtered = selectedAccountId === 'all'
      ? transactions
      : transactions.filter(
          t => (t.account_id || 'default-wallet') === selectedAccountId || t.destination_account_id === selectedAccountId
        );

    for (const t of filtered) {
      const amount = Number(t.amount || 0);
      const accId = t.account_id || 'default-wallet';

      if (t.type === 'income') {
        if (selectedAccountId === 'all' || accId === selectedAccountId) {
          inc += amount;
        }
      } else if (t.type === 'expense') {
        if (selectedAccountId === 'all' || accId === selectedAccountId) {
          exp += amount;
        }
      } else if (t.type === 'transfer' && selectedAccountId !== 'all') {
        if (t.destination_account_id === selectedAccountId) {
          inc += amount;
        }
        if (accId === selectedAccountId) {
          exp += amount;
        }
      }
    }

    let calculatedBalance = 0;
    if (selectedAccountId === 'all') {
      calculatedBalance = accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc, transactions), 0);
    } else {
      const targetAcc = accounts.find(a => a.id === selectedAccountId);
      calculatedBalance = targetAcc ? calculateAccountBalance(targetAcc, transactions) : (inc - exp);
    }

    const loans = transactions.filter((t) => t.type === 'loan_made' || t.type === 'loan_taken');
    const regulars = transactions.filter((t) => t.type === 'income' || t.type === 'expense' || t.type === 'transfer');

    return {
      totalIncome: Math.round(inc * 100) / 100,
      totalExpense: Math.round(exp * 100) / 100,
      balance: Math.round(calculatedBalance * 100) / 100,
      loansList: loans,
      regularTransactions: regulars,
    };
  }, [transactions, accounts, selectedAccountId]);
}
