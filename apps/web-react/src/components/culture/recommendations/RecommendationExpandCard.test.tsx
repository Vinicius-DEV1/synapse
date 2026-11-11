import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationExpandCard } from './RecommendationExpandCard';

describe('RecommendationExpandCard', () => {
  it('renders idle state with Exibir Mais text and calls onExpand on click', () => {
    const handleExpand = vi.fn();
    render(
      <RecommendationExpandCard
        clusterTitle="Ficção Científica"
        onExpand={handleExpand}
        isExpanding={false}
      />
    );

    expect(screen.getByText('Exibir Mais')).toBeInTheDocument();
    expect(screen.getByText(/Buscar \+ sugestões deste tema com IA/)).toBeInTheDocument();
    expect(screen.getByText('+20 a 24 obras')).toBeInTheDocument();

    const card = screen.getByRole('button', { name: /Buscar mais recomendações para Ficção Científica/ });
    fireEvent.click(card);
    expect(handleExpand).toHaveBeenCalledTimes(1);
  });

  it('triggers onExpand via keyboard Enter or Space', () => {
    const handleExpand = vi.fn();
    render(
      <RecommendationExpandCard
        clusterTitle="Ficção Científica"
        onExpand={handleExpand}
        isExpanding={false}
      />
    );

    const card = screen.getByRole('button', { name: /Buscar mais recomendações para Ficção Científica/ });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleExpand).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleExpand).toHaveBeenCalledTimes(2);
  });

  it('renders expanding state and does not trigger onExpand when clicked while busy', () => {
    const handleExpand = vi.fn();
    render(
      <RecommendationExpandCard
        clusterTitle="Ficção Científica"
        onExpand={handleExpand}
        isExpanding={true}
      />
    );

    expect(screen.getByText('Buscando Mais...')).toBeInTheDocument();
    expect(screen.getByText('Processando')).toBeInTheDocument();

    const card = screen.getByRole('button', { name: /Buscar mais recomendações para Ficção Científica/ });
    fireEvent.click(card);
    expect(handleExpand).not.toHaveBeenCalled();
  });
});
