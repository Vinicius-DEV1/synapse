import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationProgressBar } from './RecommendationProgressBar';

describe('RecommendationProgressBar', () => {
  it('does not render when isActive is false', () => {
    const { container } = render(
      <RecommendationProgressBar
        isActive={false}
        currentBatch={1}
        totalBatches={2}
        message="Curando..."
        progressPercent={30}
        totalItemsCount={0}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders batch badge, message, percent, and items count when active', () => {
    render(
      <RecommendationProgressBar
        isActive={true}
        currentBatch={1}
        totalBatches={2}
        message="Curando primeiro lote de obras..."
        progressPercent={45}
        totalItemsCount={42}
      />
    );

    expect(screen.getByText('Lote 1/2')).toBeInTheDocument();
    expect(screen.getByText('Curando primeiro lote de obras...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('42 obras prontas')).toBeInTheDocument();

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '45');
  });

  it('displays complete state when percent is 100', () => {
    render(
      <RecommendationProgressBar
        isActive={true}
        currentBatch={2}
        totalBatches={2}
        message="Catálogo completo carregado!"
        progressPercent={100}
        totalItemsCount={88}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('88 obras prontas')).toBeInTheDocument();
    expect(screen.getByText('Catálogo completo carregado!')).toBeInTheDocument();
  });
});
