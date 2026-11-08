import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PeriodSelector } from './PeriodSelector';

describe('PeriodSelector', () => {
  it('renders selected month and allows navigating forward and backward', () => {
    const handleChange = vi.fn();
    render(
      <PeriodSelector
        selectedPeriod={{ year: 2026, month: 10 }} // November (0-indexed 10)
        onChangePeriod={handleChange}
      />
    );

    expect(screen.getByText('Novembro 2026')).toBeInTheDocument();

    // Previous month button
    const prevBtn = screen.getByTitle('Mês anterior');
    fireEvent.click(prevBtn);
    expect(handleChange).toHaveBeenCalledWith({ year: 2026, month: 9 });

    // Next month button
    const nextBtn = screen.getByTitle('Próximo mês');
    fireEvent.click(nextBtn);
    expect(handleChange).toHaveBeenCalledWith({ year: 2026, month: 11 });
  });

  it('allows switching to all history mode and back', () => {
    const handleChange = vi.fn();
    render(
      <PeriodSelector
        selectedPeriod={{ year: 2026, month: 10 }}
        onChangePeriod={handleChange}
      />
    );

    const toggleBtn = screen.getByText('Ver Todo o Histórico');
    fireEvent.click(toggleBtn);
    expect(handleChange).toHaveBeenCalledWith('all');
  });
});
