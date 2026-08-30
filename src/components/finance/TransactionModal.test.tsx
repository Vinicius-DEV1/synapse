import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import TransactionModal from './TransactionModal';

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="tx-portal">{children}</div>,
}));

describe('TransactionModal Component', () => {
  it('submits new transaction form and calls onSave', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByPlaceholderText, getAllByRole, getByRole } = render(
      <TransactionModal onClose={onClose} onSave={onSave} />
    );

    const descInput = getByPlaceholderText(/Supermercado/i);
    const comboboxes = getAllByRole('combobox');
    const categorySelect = comboboxes[comboboxes.length - 1]; // Category is the last select
    const amountInput = getByPlaceholderText('0.00');

    fireEvent.change(descInput, { target: { value: 'Gasolina' } });
    fireEvent.change(categorySelect, { target: { value: 'Transporte' } });
    fireEvent.change(amountInput, { target: { value: '250.00' } });

    const submitBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Gasolina',
          amount: 250,
          type: 'expense',
          category: 'Transporte',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
