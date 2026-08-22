import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import WishlistModal from './WishlistModal';

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="wish-portal">{children}</div>,
}));

describe('WishlistModal Component', () => {
  it('submits new wishlist item and invokes onSave callback', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByPlaceholderText, getByRole } = render(
      <WishlistModal onClose={onClose} onSave={onSave} />
    );

    const titleInput = getByPlaceholderText('Ex: Novo Notebook, Viagem...');
    const priceInput = getByPlaceholderText('0.00');

    fireEvent.change(titleInput, { target: { value: 'Cadeira Ergonômica' } });
    fireEvent.change(priceInput, { target: { value: '1800.00' } });

    const saveBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cadeira Ergonômica',
          price: 1800,
          priority: 'medium',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
