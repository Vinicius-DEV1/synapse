import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinanceHelpModal } from './FinanceHelpModal';

describe('FinanceHelpModal', () => {
  it('renders modal when isOpen is true and allows tab switching', () => {
    const handleClose = vi.fn();
    render(<FinanceHelpModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByRole('dialog', { name: 'Guia do Sistema Financeiro' })).toBeDefined();
    expect(screen.getByText('Dashboard Financeiro & Métricas Consolidadas')).toBeDefined();

    // Switch to Accounts tab
    const accountsTab = screen.getByRole('button', { name: /Contas & Bancos/i });
    fireEvent.click(accountsTab);
    expect(screen.getByText('Gestão de Contas Bancárias & Saldos')).toBeDefined();

    // Switch to Loans tab
    const loansTab = screen.getByRole('button', { name: /Empréstimos & Dívidas/i });
    fireEvent.click(loansTab);
    expect(screen.getByText('Controle de Empréstimos e Amortizações')).toBeDefined();
  });

  it('closes on Escape key press or close button click', () => {
    const handleClose = vi.fn();
    render(<FinanceHelpModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByTitle('Fechar (Esc)');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn();
    render(<FinanceHelpModal isOpen={false} onClose={handleClose} />);

    expect(screen.queryByRole('dialog', { name: 'Guia do Sistema Financeiro' })).toBeNull();
  });
});
