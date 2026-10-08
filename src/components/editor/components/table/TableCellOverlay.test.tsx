import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import TableCellOverlay from './TableCellOverlay';
import * as tableColumnUtils from './tableColumnUtils';

describe('TableCellOverlay', () => {
  let mockEditor: any;
  let mockTable: HTMLTableElement;
  let wrapperRef: React.RefObject<HTMLDivElement | null>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEditor = {
      state: {},
      view: {},
    };

    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    wrapperRef = { current: wrapper };

    mockTable = document.createElement('table');
    document.body.appendChild(mockTable);
  });

  it('renders select dropdown when clicking a select-typed cell and updates text', () => {
    const updateSpy = vi.spyOn(tableColumnUtils, 'updateCellText').mockReturnValue(true);
    vi.spyOn(tableColumnUtils, 'getCellColumnMeta').mockReturnValue({
      colIndex: 1,
      type: 'select',
      options: ['Opção 1', 'Opção 2'],
    });

    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = 'Opção 1';
    tr.appendChild(td);
    mockTable.appendChild(tr);

    const { getByText } = render(
      <TableCellOverlay
        editor={mockEditor}
        activeTable={mockTable}
        wrapperRef={wrapperRef}
      />
    );

    // Simulate clicking the cell
    fireEvent.click(td);

    // Options dropdown should appear
    expect(getByText('Opção 2')).toBeDefined();

    // Click Opção 2
    fireEvent.click(getByText('Opção 2'));

    expect(updateSpy).toHaveBeenCalledWith(mockEditor, td, 'Opção 2');
  });

  it('directly toggles checkbox when clicking a checkbox-typed cell', () => {
    const toggleSpy = vi.spyOn(tableColumnUtils, 'toggleCheckboxCell').mockReturnValue(true);
    vi.spyOn(tableColumnUtils, 'getCellColumnMeta').mockReturnValue({
      colIndex: 0,
      type: 'checkbox',
      options: [],
    });

    const tr = document.createElement('tr');
    const td = document.createElement('td');
    tr.appendChild(td);
    mockTable.appendChild(tr);

    render(
      <TableCellOverlay
        editor={mockEditor}
        activeTable={mockTable}
        wrapperRef={wrapperRef}
      />
    );

    fireEvent.click(td);

    expect(toggleSpy).toHaveBeenCalledWith(mockEditor, td);
  });

  it('does nothing when clicking a normal text cell', () => {
    vi.spyOn(tableColumnUtils, 'getCellColumnMeta').mockReturnValue({
      colIndex: 0,
      type: 'text',
      options: [],
    });

    const tr = document.createElement('tr');
    const td = document.createElement('td');
    tr.appendChild(td);
    mockTable.appendChild(tr);

    const { queryByText } = render(
      <TableCellOverlay
        editor={mockEditor}
        activeTable={mockTable}
        wrapperRef={wrapperRef}
      />
    );

    fireEvent.click(td);
    expect(queryByText(/Selecione/i)).toBeNull();
  });
});
