import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from './ConfirmModal';
import { StoreProvider } from '../../store/useStore';

describe('ConfirmModal component', () => {
  beforeEach(() => {
    (window as any).api = {
      calendar: {
        getEvents: vi.fn().mockResolvedValue([]),
      },
    };
  });

  it('renders confirmation text and handles confirm / cancel clicks', () => {
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

    expect(screen.getByText('Excluir página')).toBeInTheDocument();
    expect(screen.getByText('Capítulo 3: Cálculo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancelar'));
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Sim, excluir'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
