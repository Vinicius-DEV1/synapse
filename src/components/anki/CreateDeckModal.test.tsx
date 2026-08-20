import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateDeckModal from './CreateDeckModal';

describe('CreateDeckModal component', () => {
  it('renders form inputs and handles deck submission', async () => {
    const handleClose = vi.fn();
    const handleCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateDeckModal
        parentId={null}
        onClose={handleClose}
        onCreate={handleCreate}
      />
    );

    expect(screen.getByRole('heading', { name: 'Novo Baralho' })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('Ex: Inglês - Phrasal Verbs');
    const descInput = screen.getByPlaceholderText('Ex: Verbos úteis para conversação');

    fireEvent.change(nameInput, { target: { value: 'Italian Vocabulary' } });
    fireEvent.change(descInput, { target: { value: 'Common everyday words' } });

    const submitBtn = screen.getByRole('button', { name: 'Criar' });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleCreate).toHaveBeenCalledWith(
        'Italian Vocabulary',
        'Common everyday words',
        null
      );
    });
  });

  it('displays Subbaralho title when parentId is provided', () => {
    render(
      <CreateDeckModal
        parentId="parent-deck-id"
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Novo Subbaralho' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Subbaralho' })).toBeInTheDocument();
  });
});
