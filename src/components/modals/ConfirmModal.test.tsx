import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from './ConfirmModal';
import { StoreProvider } from '../../store/useStore';
import { I18nProvider } from '../../i18n';

describe('ConfirmModal component', () => {
  beforeEach(() => {
    (window as any).api = {
      calendar: {
        getEvents: vi.fn().mockResolvedValue([]),
      },
    };
  });

  it('renders confirmation text in English by default and handles confirm / cancel clicks', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <StoreProvider>
        <ConfirmModal
          pageId="page-test-id"
          pageName="Capítulo 3: Cálculo"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </StoreProvider>
    );

    expect(screen.getByText('Delete page')).toBeInTheDocument();
    expect(screen.getByText(/Capítulo 3: Cálculo/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Yes, delete'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders confirmation text in Portuguese when language is pt-BR', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <StoreProvider>
        <I18nProvider initialLanguage="pt-BR">
          <ConfirmModal
            pageId="page-test-id"
            pageName="Capítulo 3: Cálculo"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </I18nProvider>
      </StoreProvider>
    );

    expect(screen.getByText('Excluir página')).toBeInTheDocument();
    expect(screen.getByText(/Capítulo 3: Cálculo/)).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Sim, excluir')).toBeInTheDocument();
  });
});
