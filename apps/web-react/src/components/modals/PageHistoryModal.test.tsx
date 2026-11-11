import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PageHistoryModal from './PageHistoryModal';

vi.mock('htmldiff-js', () => ({
  default: {
    execute: vi.fn((oldHtml: string, newHtml: string) => {
      return `<ins>${newHtml}</ins><del>${oldHtml}</del>`;
    }),
  },
}));

describe('PageHistoryModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then displays history entries', async () => {
    const mockHistory = [
      {
        id: 'h2',
        page_id: 'p1',
        title: 'Título Recente',
        content: '<p>Conteúdo Recente</p>',
        created_at: '2026-09-02T18:00:00Z',
      },
      {
        id: 'h1',
        page_id: 'p1',
        title: 'Título Antigo',
        content: '<p>Conteúdo Antigo</p>',
        created_at: '2026-09-02T12:00:00Z',
      },
    ];

    window.api = {
      ...window.api,
      getPageHistory: vi.fn().mockResolvedValue(mockHistory),
    } as any;

    render(<PageHistoryModal pageId="p1" onClose={vi.fn()} />);

    expect(screen.getByText('Carregando...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText('Versão Atual').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Revisão 1')).toBeDefined();
  });

  it('displays empty state when page has no prior revisions', async () => {
    window.api = {
      ...window.api,
      getPageHistory: vi.fn().mockResolvedValue([]),
    } as any;

    render(<PageHistoryModal pageId="p1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum histórico encontrado.')).toBeDefined();
    });
  });
});
