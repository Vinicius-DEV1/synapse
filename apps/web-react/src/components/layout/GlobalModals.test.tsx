import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { GlobalModals } from './GlobalModals';
import { I18nProvider } from '../../i18n';

// Mock store
vi.mock('../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    state: {
      pages: [],
      moduleKeys: {},
      user: null,
    },
    dispatch: vi.fn(),
  })),
}));

// Mock BackgroundTaskWidget
vi.mock('./BackgroundTaskWidget', () => ({
  default: () => null,
}));

// Mock useShareAccessRequests
vi.mock('../../hooks/useShareAccessRequests', () => ({
  useShareAccessRequests: vi.fn(() => ({
    pendingRequests: [],
    activeModalRequest: null,
    setActiveModalRequest: vi.fn(),
    approveRequest: vi.fn(),
    denyRequest: vi.fn(),
  })),
}));

describe('GlobalModals In-App Confirmation Pipeline', () => {
  const defaultProps = {
    renamePageId: null,
    setRenamePageId: vi.fn(),
    movePageId: null,
    setMovePageId: vi.fn(),
    floatingPageId: null,
    setFloatingPageId: vi.fn(),
    isDriveAuthModalOpen: false,
    setIsDriveAuthModalOpen: vi.fn(),
    syncStatus: 'idle' as const,
    handleDeletePage: vi.fn(),
    handleUpdatePage: vi.fn(),
    handleUpdateContent: vi.fn(),
    handleCreatePage: vi.fn(),
    handleCreateLinkedPage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ConfirmDialog when caderno-request-confirm event is dispatched and resolves true on confirm', async () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <GlobalModals {...defaultProps} />
      </I18nProvider>
    );

    let resolvedValue: boolean | null = null;
    const resolve = (val: boolean) => {
      resolvedValue = val;
    };

    act(() => {
      window.dispatchEvent(
        new CustomEvent('caderno-request-confirm', {
          detail: {
            title: 'Excluir Item Global',
            message: 'Tem certeza que deseja apagar?',
            kind: 'warning',
            resolve,
          },
        })
      );
    });

    expect(await screen.findByText('Excluir Item Global')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza que deseja apagar?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /continuar/i });
    act(() => {
      fireEvent.click(confirmBtn);
    });

    expect(resolvedValue).toBe(true);
    expect(screen.queryByText('Excluir Item Global')).not.toBeInTheDocument();
  });

  it('resolves false and closes dialog when user clicks cancel', async () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <GlobalModals {...defaultProps} />
      </I18nProvider>
    );

    let resolvedValue: boolean | null = null;
    const resolve = (val: boolean) => {
      resolvedValue = val;
    };

    act(() => {
      window.dispatchEvent(
        new CustomEvent('caderno-request-confirm', {
          detail: {
            title: 'Descartar Alterações',
            message: 'Deseja descartar sem salvar?',
            kind: 'info',
            resolve,
          },
        })
      );
    });

    expect(await screen.findByText('Descartar Alterações')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    act(() => {
      fireEvent.click(cancelBtn);
    });

    expect(resolvedValue).toBe(false);
    expect(screen.queryByText('Descartar Alterações')).not.toBeInTheDocument();
  });

  it('resolves false and dismisses dialog on caderno-back-press', async () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <GlobalModals {...defaultProps} />
      </I18nProvider>
    );

    let resolvedValue: boolean | null = null;
    const resolve = (val: boolean) => {
      resolvedValue = val;
    };

    act(() => {
      window.dispatchEvent(
        new CustomEvent('caderno-request-confirm', {
          detail: {
            title: 'Ação Crítica',
            message: 'Pressione voltar para cancelar',
            kind: 'error',
            resolve,
          },
        })
      );
    });

    expect(await screen.findByText('Ação Crítica')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('caderno-back-press'));
    });

    expect(resolvedValue).toBe(false);
    expect(screen.queryByText('Ação Crítica')).not.toBeInTheDocument();
  });
});
