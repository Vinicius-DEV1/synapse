import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SharePasswordGate } from './components/SharePasswordGate';
import { ShareWaitingApproval } from './components/ShareWaitingApproval';
import { ShareExpiredScreen } from './components/ShareExpiredScreen';
import { ShareAccessDenied } from './components/ShareAccessDenied';
import type { VisitorPersona } from '../types/sharing';

describe('ShareViewer UI States', () => {
  const mockPersona: VisitorPersona = {
    name: 'SyntaxLynx',
    animal: 'Lynx',
    color: '#10b981',
    tagline: 'Linting reality',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SharePasswordGate with prompt and lock icon', () => {
    render(
      <SharePasswordGate
        pageTitle="Notas Secretas"
        pageIcon="🔒"
        onVerify={vi.fn()}
      />
    );

    expect(screen.getByText('Notas Secretas')).toBeDefined();
    expect(screen.getByText('Esta página está protegida por senha')).toBeDefined();
    expect(screen.getByPlaceholderText('Digite a senha de acesso...')).toBeDefined();
  });

  it('renders ShareWaitingApproval with owner notification status and animal pun persona', () => {
    render(
      <ShareWaitingApproval
        pageTitle="Documento Compartilhado"
        pageIcon="📜"
        persona={mockPersona}
        requestedAt={new Date().toISOString()}
      />
    );

    expect(screen.getByText('Documento Compartilhado')).toBeDefined();
    expect(
      screen.getByText('Aguardando autorização do proprietário...')
    ).toBeDefined();
    expect(screen.getByText('SyntaxLynx')).toBeDefined();
  });

  it('renders ShareAccessDenied with retry button', () => {
    const handleRetry = vi.fn();
    render(<ShareAccessDenied onRetry={handleRetry} />);

    expect(screen.getByText('Acesso Recusado')).toBeDefined();
    expect(screen.getByText('Tentar Novamente')).toBeDefined();
  });

  it('renders ShareExpiredScreen with appropriate status messages', () => {
    const { rerender } = render(<ShareExpiredScreen reason="revoked" />);
    expect(screen.getByText('Compartilhamento Revogado')).toBeDefined();

    rerender(<ShareExpiredScreen reason="expired" />);
    expect(screen.getByText('Link Expirado')).toBeDefined();

    rerender(<ShareExpiredScreen reason="not-found" />);
    expect(screen.getByText('Página Não Encontrada')).toBeDefined();
  });
});
