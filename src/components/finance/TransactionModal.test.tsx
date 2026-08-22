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

    const { getByPlaceholderText, getByRole } = render(
      <TransactionModal onClose={onClose} onSave={onSave} />
    );

    const descInput = getByPlaceholderText('Ex: Salário, Supermercado...');
    const amountInput = getByPlaceholderText('0.00');

    fireEvent.change(descInput, { target: { value: 'Gasolina' } });
    fireEvent.change(amountInput, { target: { value: '250.00' } });

    const submitBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Gasolina',
          amount: 250,
          type: 'expense',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
