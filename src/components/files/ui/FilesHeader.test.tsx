import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilesHeader } from './FilesHeader';

describe('FilesHeader Component', () => {
  const defaultProps = {
    breadcrumbs: [{ id: null, name: 'Início' }],
    canGoBack: false,
    canGoForward: false,
    canGoUp: false,
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
    onGoUp: vi.fn(),
    onNavigateBreadcrumb: vi.fn(),
    onDropOnFolder: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    viewMode: 'table' as const,
    onChangeViewMode: vi.fn(),
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    onToggleSort: vi.fn(),
    isInspectorOpen: false,
    onToggleInspector: vi.fn(),
    driveStatus: 'connected' as const,
    onOpenDriveAuth: vi.fn(),
    onOpenFolderUpload: vi.fn(),
    onOpenFileUpload: vi.fn(),
    onNewFolder: vi.fn(),
    isSidebarOpen: true,
    onToggleSidebar: vi.fn(),
    showCategoryFilter: true,
    onToggleCategoryFilter: vi.fn(),
    onReload: vi.fn(),
  };

  it('renders search input and breadcrumb', () => {
    render(<FilesHeader {...defaultProps} />);
    expect(screen.getByPlaceholderText('Buscar... (Ctrl+F)')).toBeInTheDocument();
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('opens unified Add dropdown and triggers actions', () => {
    render(<FilesHeader {...defaultProps} />);
    const addButton = screen.getByTitle('Adicionar arquivos ou pastas');
    fireEvent.click(addButton);

    expect(screen.getByText('Adicionar Arquivo(s)...')).toBeInTheDocument();
    expect(screen.getByText('Enviar Pasta Completa')).toBeInTheDocument();
    expect(screen.getByText('Criar Nova Pasta')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Adicionar Arquivo(s)...'));
    expect(defaultProps.onOpenFileUpload).toHaveBeenCalledTimes(1);
  });

  it('opens more options menu and displays secondary actions', () => {
    render(<FilesHeader {...defaultProps} />);
    const moreButton = screen.getByLabelText('Mais opções');
    fireEvent.click(moreButton);

    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Painel de Detalhes')).toBeInTheDocument();
    expect(screen.getByText('Barra de Filtros')).toBeInTheDocument();
    expect(screen.getByText('Recarregar Arquivos')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Recarregar Arquivos'));
    expect(defaultProps.onReload).toHaveBeenCalledTimes(1);
  });

  it('triggers sidebar toggle when toggle button is clicked', () => {
    render(<FilesHeader {...defaultProps} />);
    const sidebarButton = screen.getByLabelText('Ocultar barra de pastas');
    fireEvent.click(sidebarButton);
    expect(defaultProps.onToggleSidebar).toHaveBeenCalledTimes(1);
  });
});
