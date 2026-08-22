import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFinance } from './useFinance';
import type { Transaction, WishlistItem } from '../../../types';

describe('useFinance Hook', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx_1',
      type: 'expense',
      amount: 150.5,
      description: 'Supermercado',
      category: 'alimentacao',
      date: '2026-08-20',
      created_at: 1000,
      updated_at: 1000,
    },
  ];

  const mockWishlist: WishlistItem[] = [
    {
      id: 'wish_1',
      title: 'Monitor 4K',
      estimated_price: 2500,
      priority: 'high',
      status: 'pending',
      created_at: 1000,
      updated_at: 1000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      finance: {
        getTransactions: vi.fn().mockResolvedValue(mockTransactions),
        getWishlist: vi.fn().mockResolvedValue(mockWishlist),
        createTransaction: vi.fn().mockResolvedValue({ id: 'tx_2' }),
        updateTransaction: vi.fn().mockResolvedValue(undefined),
        deleteTransaction: vi.fn().mockResolvedValue(undefined),
        createWishlist: vi.fn().mockResolvedValue({ id: 'wish_2' }),
        updateWishlist: vi.fn().mockResolvedValue(undefined),
        deleteWishlist: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('loads transactions and wishlist items on mount', async () => {
    const { result } = renderHook(() => useFinance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.wishlist).toHaveLength(1);
    });

    expect(result.current.transactions[0].description).toBe('Supermercado');
    expect(result.current.wishlist[0].title).toBe('Monitor 4K');
  });

  it('creates and deletes a transaction', async () => {
    const { result } = renderHook(() => useFinance());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createTransaction({
        amount: 80,
        description: 'Livro de Rust',
      });
    });

    expect(window.api.finance.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Livro de Rust' })
    );

    await act(async () => {
      await result.current.deleteTransaction('tx_1');
    });

    expect(window.api.finance.deleteTransaction).toHaveBeenCalledWith('tx_1');
  });
});
