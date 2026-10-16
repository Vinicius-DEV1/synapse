import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiagramsModule from './DiagramsModule';
import { I18nProvider } from '../../i18n';

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nProvider initialLanguage="pt-BR">{ui}</I18nProvider>);
};

describe('DiagramsModule Component', () => {
  const mockDiagrams = [
    {
      id: 'd1',
      title: 'Fluxograma de Projeto',
      icon: '🎨',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      diagrams: {
        getAll: vi.fn().mockResolvedValue(mockDiagrams),
        create: vi.fn().mockImplementation((data) =>
          Promise.resolve({
            id: 'd2',
            title: data.title,
            icon: data.icon,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        ),
        delete: vi.fn().mockResolvedValue(true),
        getContent: vi.fn().mockResolvedValue({ id: 'd1', content: null }),
        update: vi.fn().mockResolvedValue(true),
      },
    };
  });

  it('renders diagrams list and header correctly', async () => {
    renderWithI18n(<DiagramsModule />);

    expect(screen.getByText('Diagramas')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Fluxograma de Projeto')).toBeInTheDocument();
    });
  });

  it('opens and closes create diagram modal with Escape key', async () => {
    renderWithI18n(<DiagramsModule />);

    const newBtn = screen.getByText('Novo Diagrama');
    fireEvent.click(newBtn);

    expect(screen.getByPlaceholderText('Ex: Mapa Mental de História')).toBeInTheDocument();

    // Press Escape to dismiss modal
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Ex: Mapa Mental de História')).not.toBeInTheDocument();
    });
  });

  it('shows in-app delete confirmation modal and confirms deletion', async () => {
    renderWithI18n(<DiagramsModule />);

    await waitFor(() => {
      expect(screen.getByText('Fluxograma de Projeto')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Excluir');
    fireEvent.click(deleteBtn);

    // In-app confirmation dialog should appear
    expect(screen.getByText('Excluir Diagrama')).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja apagar o diagrama/i)).toBeInTheDocument();

    const confirmBtn = screen.getByText('Sim, Excluir');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect((window as any).api.diagrams.delete).toHaveBeenCalledWith('d1');
    });
  });
});
