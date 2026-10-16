import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibraryCreateCollectionModal } from './LibraryCreateCollectionModal';
import type { LibraryCollection } from '../../../types';

describe('LibraryCreateCollectionModal', () => {
  it('renders create mode with title and submits new collection', async () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <LibraryCreateCollectionModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    expect(screen.getByText('Nova Coleção')).toBeDefined();
    const input = screen.getByPlaceholderText('Ex: Ficção Científica, Estudos, Clássicos...');
    fireEvent.change(input, { target: { value: 'Filosofia' } });

    const submitBtn = screen.getByRole('button', { name: /criar coleção/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({ name: 'Filosofia', color: '#6366f1' });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('renders edit mode with existing collection data', async () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const existing: LibraryCollection = {
      id: 'col-1',
      name: 'Arquitetura de Software',
      color: '#10b981',
      created_at: '2026-01-01',
    };

    render(
      <LibraryCreateCollectionModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        initialCollection={existing}
      />
    );

    expect(screen.getByText('Editar Coleção')).toBeDefined();
    const input = screen.getByDisplayValue('Arquitetura de Software');
    expect(input).toBeDefined();

    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        name: 'Arquitetura de Software',
        color: '#10b981',
      });
    });
  });

  it('closes on Escape key press or Cancel button', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <LibraryCreateCollectionModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
