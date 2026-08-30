import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFinance } from './useFinance';
import type { Transaction, WishlistItem, Account } from '../../../types';

describe('useFinance Hook', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc_1',
      name: 'Nubank',
      color: '#8a05be',
      icon: 'wallet',
      initial_balance: 1000,
      created_at: '2026-08-20',
    },
    {
      id: 'acc_2',
      name: 'Bradesco',
      color: '#dc2626',
      icon: 'building',
      initial_balance: 500,
      created_at: '2026-08-20',
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx_1',
      type: 'loan_made',
      amount: 150,
      paid_amount: 0,
      description: 'Empréstimo Amigo',
      category: 'Pessoal',
      date: '2026-08-20',
      account_id: 'acc_1',
      status: 'in_progress',
      is_paid: 0,
      created_at: '2026-08-20',
    },
  ];

  const mockWishlist: WishlistItem[] = [
    {
      id: 'wish_1',
      title: 'Monitor 4K',
      price: 2500,
      priority: 'high',
      expected_date: null,
      description: null,
      link: null,
      created_at: '2026-08-20',
      updated_at: '2026-08-20',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      finance: {
        getTransactions: vi.fn().mockResolvedValue(mockTransactions),
        getWishlist: vi.fn().mockResolvedValue(mockWishlist),
        getAccounts: vi.fn().mockResolvedValue(mockAccounts),
        createTransaction: vi.fn().mockResolvedValue({ id: 'tx_2' }),
        updateTransaction: vi.fn().mockResolvedValue({ success: true }),
        deleteTransaction: vi.fn().mockResolvedValue(true),
        createAccount: vi.fn().mockResolvedValue({ id: 'acc_3' }),
        updateAccount: vi.fn().mockResolvedValue({ success: true }),
        deleteAccount: vi.fn().mockResolvedValue(true),
        createWishlist: vi.fn().mockResolvedValue({ id: 'wish_2' }),
        updateWishlist: vi.fn().mockResolvedValue({ success: true }),
        deleteWishlist: vi.fn().mockResolvedValue(true),
      },
    };
  });

  it('loads transactions, accounts and wishlist items on mount', async () => {
    const { result } = renderHook(() => useFinance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.accounts).toHaveLength(2);
      expect(result.current.wishlist).toHaveLength(1);
    });

    expect(result.current.transactions[0].description).toBe('Empréstimo Amigo');
    expect(result.current.accounts[0].name).toBe('Nubank');
    expect(result.current.wishlist[0].title).toBe('Monitor 4K');
  });

  it('creates and manages accounts', async () => {
    const { result } = renderHook(() => useFinance());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createAccount({
        name: 'Inter',
        color: '#ff5f00',
        initial_balance: 200,
      });
    });

    expect(window.api.finance.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Inter' })
    );

    await act(async () => {
      await result.current.deleteAccount('acc_2');
    });

    expect(window.api.finance.deleteAccount).toHaveBeenCalledWith('acc_2');
  });

  it('pays loan into specific account (Option A)', async () => {
    const { result } = renderHook(() => useFinance());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.payLoanWithAccount(mockTransactions[0], 50, 'acc_2');
    });

    // Updates loan paid_amount to 50
    expect(window.api.finance.updateTransaction).toHaveBeenCalledWith(
      'tx_1',
      expect.objectContaining({
        paid_amount: 50,
        is_paid: 0,
      })
    );

    // Creates linked income transaction in acc_2 (Bradesco)
    expect(window.api.finance.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'income',
        amount: 50,
        account_id: 'acc_2',
        linked_loan_id: 'tx_1',
      })
    );
  });
});

