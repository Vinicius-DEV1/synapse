import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

const ProblematicChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Erro fatal na renderização');
  }
  return <div>Aplicação Saudável</div>;
};

describe('GlobalErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <GlobalErrorBoundary>
        <ProblematicChild shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    expect(getByText('Aplicação Saudável')).toBeDefined();
  });

  it('renders fallback error UI when a child crashes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <GlobalErrorBoundary>
        <ProblematicChild shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(getByText(/Ops! Algo deu errado/i)).toBeDefined();
    expect(getByText(/Erro fatal na renderização/i)).toBeDefined();
    expect(getByText(/Tentar Novamente/i)).toBeDefined();

    consoleSpy.mockRestore();
  });
});
