import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Explosive component error!');
  }
  return <div>Component rendered safely</div>;
};

describe('ErrorBoundary component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary moduleName="TestModule">
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component rendered safely')).toBeInTheDocument();
  });

  it('catches render error and displays fallback UI with retry button', () => {
    // Suppress React error boundary console output during intentional error test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary moduleName="Notas">
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/Explosive component error!/)).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders custom fallback if provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom Error View</div>}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error View')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
