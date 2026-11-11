import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CadernoDatePicker } from './CadernoDatePicker';

describe('CadernoDatePicker', () => {
  it('renders placeholder when value is empty and opens popover on click', () => {
    const handleChange = vi.fn();
    render(
      <CadernoDatePicker
        value=""
        onChange={handleChange}
        label="Data do Gasto"
        placeholder="Opcional - Sem data"
      />
    );

    expect(screen.getByText('Data do Gasto')).toBeInTheDocument();
    expect(screen.getByText('Opcional - Sem data')).toBeInTheDocument();

    // Click trigger to open
    fireEvent.click(screen.getByText('Opcional - Sem data'));
    expect(screen.getByRole('dialog', { name: /calendário/i })).toBeInTheDocument();
  });

  it('selects a day and triggers onChange with YYYY-MM-DD', () => {
    const handleChange = vi.fn();
    render(
      <CadernoDatePicker
        value="2026-11-08"
        onChange={handleChange}
        label="Data"
      />
    );

    // Click trigger to open
    fireEvent.click(screen.getByText(/08\/11\/2026/));
    expect(screen.getByText('Novembro 2026')).toBeInTheDocument();

    // Click day 15
    const day15Btn = screen.getByRole('button', { name: '15' });
    fireEvent.click(day15Btn);

    expect(handleChange).toHaveBeenCalledWith('2026-11-15');
  });

  it('allows clearing the date when clear button is clicked', () => {
    const handleChange = vi.fn();
    render(
      <CadernoDatePicker
        value="2026-11-08"
        onChange={handleChange}
        label="Vencimento"
        required={false}
      />
    );

    const clearBtns = screen.getAllByTitle('Limpar data');
    fireEvent.click(clearBtns[0]);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('closes popover on outside click', () => {
    const handleChange = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <CadernoDatePicker
          value=""
          onChange={handleChange}
          label="Data"
        />
      </div>
    );

    fireEvent.click(screen.getByText('Selecionar data...'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

