import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import TableToolbar from './TableToolbar';

describe('TableToolbar Component', () => {
  let mockEditor: any;
  let chainObj: any;

  beforeEach(() => {
    vi.clearAllMocks();

    chainObj = {
      focus: vi.fn().mockReturnThis(),
      addRowBefore: vi.fn().mockReturnThis(),
      addRowAfter: vi.fn().mockReturnThis(),
      deleteRow: vi.fn().mockReturnThis(),
      addColumnBefore: vi.fn().mockReturnThis(),
      addColumnAfter: vi.fn().mockReturnThis(),
      deleteColumn: vi.fn().mockReturnThis(),
      deleteTable: vi.fn().mockReturnThis(),
      updateAttributes: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue(true),
    };

    mockEditor = {
      chain: vi.fn(() => chainObj),
    };
  });

  it('triggers add row below and delete table commands', () => {
    const { getByTitle } = render(<TableToolbar editor={mockEditor} />);

    const addRowBtn = getByTitle(/Adicionar linha abaixo/i);
    fireEvent.click(addRowBtn);

    expect(chainObj.addRowAfter).toHaveBeenCalled();
    expect(chainObj.run).toHaveBeenCalled();

    const deleteTableBtn = getByTitle(/Excluir tabela inteira/i);
    fireEvent.click(deleteTableBtn);

    expect(chainObj.deleteTable).toHaveBeenCalled();
  });
});
