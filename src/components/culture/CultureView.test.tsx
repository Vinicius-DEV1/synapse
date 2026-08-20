import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CultureView from './CultureView';

describe('CultureView component', () => {
  beforeEach(() => {
    (window as any).api = {
      culture: {
        getItems: vi.fn().mockResolvedValue([
          {
            id: 'cult-1',
            title: 'Interestelar',
            type: 'filme',
            status: 'completed',
            progress: 100,
            total_progress: 100,
            score: 10,
            is_favorite: true,
          },
        ]),
        getRecentReleases: vi.fn().mockResolvedValue([]),
        createItem: vi.fn(),
        updateItem: vi.fn(),
        deleteItem: vi.fn(),
      },
    };
  });

  it('renders culture view with search input and culture items', async () => {
    render(<CultureView />);

    expect(screen.getByPlaceholderText('Buscar título ou sinopse...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Interestelar')).toBeInTheDocument();
    });
  });
});
