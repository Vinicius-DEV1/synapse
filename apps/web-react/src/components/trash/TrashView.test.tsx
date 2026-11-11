import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrashView from './TrashView';
import { StoreProvider } from '../../store/useStore';

describe('TrashView component', () => {
  beforeEach(() => {
    (window as any).api = {
      trash: {
        getAll: vi.fn().mockResolvedValue([
          {
            id: 'trash-item-1',
            title: 'Excluído Rascunho',
            item_type: 'page',
            deleted_at: new Date().toISOString(),
          },
        ]),
        restore: vi.fn().mockResolvedValue(true),
        hardDelete: vi.fn().mockResolvedValue(true),
        emptyAll: vi.fn().mockResolvedValue(true),
      },
    };
  });

  it('renders trash table with trashed items and filters', async () => {
    render(
      <StoreProvider>
        <TrashView />
      </StoreProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Lixeira Universal/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Excluído Rascunho')).toBeInTheDocument();
    });
  });

  it('handles restore item action', async () => {
    render(
      <StoreProvider>
        <TrashView />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Excluído Rascunho')).toBeInTheDocument();
    });

    const restoreBtn = screen.getByTitle('Restaurar');
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect((window as any).api.trash.restore).toHaveBeenCalledWith('trash-item-1', 'page');
    });
  });
});
