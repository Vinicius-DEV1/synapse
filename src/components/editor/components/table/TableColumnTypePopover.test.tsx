import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import TableColumnTypePopover from './TableColumnTypePopover';

describe('TableColumnTypePopover', () => {
  let mockEditor: any;
  const onTypeChange = vi.fn();
  const onFilterChange = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor = {
      state: {},
      view: {},
    };
  });

  it('renders all column type selector options', () => {
    const { getByText } = render(
      <TableColumnTypePopover
        editor={mockEditor}
        columnIndex={0}
        currentType="text"
        currentOptions={null}
        columnFilter={null}
        onTypeChange={onTypeChange}
        onFilterChange={onFilterChange}
        onClose={onClose}
        anchorLeft={100}
        anchorTop={50}
      />
    );

    expect(getByText('Texto')).toBeDefined();
    expect(getByText('Número')).toBeDefined();
    expect(getByText('Data')).toBeDefined();
    expect(getByText('Seleção')).toBeDefined();
    expect(getByText('Checkbox')).toBeDefined();
  });

  it('calls onTypeChange when clicking another column type', () => {
    const { getByText } = render(
      <TableColumnTypePopover
        editor={mockEditor}
        columnIndex={1}
        currentType="text"
        currentOptions={null}
        columnFilter={null}
        onTypeChange={onTypeChange}
        onFilterChange={onFilterChange}
        onClose={onClose}
        anchorLeft={100}
        anchorTop={50}
      />
    );

    fireEvent.click(getByText('Número'));
    expect(onTypeChange).toHaveBeenCalledWith('number');
  });

  it('renders options editor and handles adding/removing select options', () => {
    const { getByPlaceholderText, getByTitle, getByText } = render(
      <TableColumnTypePopover
        editor={mockEditor}
        columnIndex={2}
        currentType="select"
        currentOptions={JSON.stringify(['Pendente', 'Concluído'])}
        columnFilter={null}
        onTypeChange={onTypeChange}
        onFilterChange={onFilterChange}
        onClose={onClose}
        anchorLeft={100}
        anchorTop={50}
      />
    );

    // Existing options are rendered
    expect(getByText('Pendente')).toBeDefined();
    expect(getByText('Concluído')).toBeDefined();

    // Add option
    const input = getByPlaceholderText('Nova opção…');
    fireEvent.change(input, { target: { value: 'Cancelado' } });
    fireEvent.click(getByTitle('Adicionar opção'));

    expect(onTypeChange).toHaveBeenCalledWith(
      'select',
      JSON.stringify(['Pendente', 'Concluído', 'Cancelado'])
    );

    // Remove option
    const removeBtn = getByTitle('Remover "Pendente"');
    fireEvent.click(removeBtn);
    expect(onTypeChange).toHaveBeenCalledWith(
      'select',
      JSON.stringify(['Concluído', 'Cancelado'])
    );
  });

  it('handles applying a filter', () => {
    const { getByText } = render(
      <TableColumnTypePopover
        editor={mockEditor}
        columnIndex={0}
        currentType="text"
        currentOptions={null}
        columnFilter={null}
        onTypeChange={onTypeChange}
        onFilterChange={onFilterChange}
        onClose={onClose}
        anchorLeft={100}
        anchorTop={50}
      />
    );

    // Expand filter
    fireEvent.click(getByText(/Filtrar Coluna/i));

    // Click Aplicar
    const applyBtn = getByText('Aplicar');
    fireEvent.click(applyBtn);

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        columnIndex: 0,
        operator: 'contains',
      })
    );
  });
});
