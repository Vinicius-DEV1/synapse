import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AcquireWishlistModal } from './AcquireWishlistModal';
import type { WishlistItem, Account } from '../../../types';

vi.mock('../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('AcquireWishlistModal', () => {
  const mockItem: WishlistItem = {
    id: 'wish_1',
    title: 'Monitor 4K',
    price: 1500,
    priority: 'high',
    category: 'Tecnologia',
    expected_date: '2026-12-31',
    description: 'Monitor para trabalho',
    link: null,
    created_at: '',
    updated_at: '',
  };

  const mockAccounts: Account[] = [
    { id: 'acc_1', name: 'Bradesco', type: 'checking', balance: 3000, color: '#3b82f6', is_active: 1, created_at: '', updated_at: '' },
  ];

  it('renders prefilled fields and confirms acquisition with expense data', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <AcquireWishlistModal
        item={mockItem}
        accounts={mockAccounts}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(screen.getByText('Confirmar Aquisição do Desejo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Monitor 4K')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1500')).toBeInTheDocument();

    // Confirm button
    const confirmBtn = screen.getByRole('button', { name: /confirmar aquisição/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith({
        amount: 1500,
        accountId: 'acc_1',
        date: expect.any(String),
        category: 'Tecnologia',
        description: 'Monitor 4K',
        deleteFromWishlist: true,
      });
      expect(handleClose).toHaveBeenCalled();
    });
  });
});

