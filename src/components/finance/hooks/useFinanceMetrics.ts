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
    let incCents = 0;
    let expCents = 0;

    const filtered = selectedAccountId === 'all'
      ? transactions
      : transactions.filter(
          t => (t.account_id || 'default-wallet') === selectedAccountId || t.destination_account_id === selectedAccountId
        );

    for (const t of filtered) {
      const amountCents = Math.round(Number(t.amount || 0) * 100);
      const accId = t.account_id || 'default-wallet';

      if (t.type === 'income') {
        if (selectedAccountId === 'all' || accId === selectedAccountId) {
          incCents += amountCents;
        }
      } else if (t.type === 'expense') {
        if (selectedAccountId === 'all' || accId === selectedAccountId) {
          expCents += amountCents;
        }
      } else if (t.type === 'transfer' && selectedAccountId !== 'all') {
        if (t.destination_account_id === selectedAccountId) {
          incCents += amountCents;
        }
        if (accId === selectedAccountId) {
          expCents += amountCents;
        }
      }
    }

    let calculatedBalanceCents = 0;
    if (selectedAccountId === 'all') {
      calculatedBalanceCents = accounts.reduce(
        (sum, acc) => sum + Math.round(calculateAccountBalance(acc, transactions) * 100),
        0
      );
    } else {
      const targetAcc = accounts.find(a => a.id === selectedAccountId);
      calculatedBalanceCents = targetAcc
        ? Math.round(calculateAccountBalance(targetAcc, transactions) * 100)
        : (incCents - expCents);
    }

    const loans = transactions.filter((t) => t.type === 'loan_made' || t.type === 'loan_taken');
    const regulars = transactions.filter((t) => t.type === 'income' || t.type === 'expense' || t.type === 'transfer');

    return {
      totalIncome: incCents / 100,
      totalExpense: expCents / 100,
      balance: calculatedBalanceCents / 100,
      loansList: loans,
      regularTransactions: regulars,
    };
  }, [transactions, accounts, selectedAccountId]);
}
