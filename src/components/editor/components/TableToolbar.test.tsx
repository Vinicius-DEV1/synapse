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
      isActive: vi.fn((name: string) => name === 'table'),
      state: {
        selection: {
          $from: { pos: 5 },
          $to: { pos: 5 },
        },
      },
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

  it('triggers text formatting commands like bold, italic, and spoiler', () => {
    chainObj.toggleBold = vi.fn().mockReturnThis();
    chainObj.toggleItalic = vi.fn().mockReturnThis();
    chainObj.toggleSpoiler = vi.fn().mockReturnThis();

    const { getByTitle } = render(<TableToolbar editor={mockEditor} />);

    const boldBtn = getByTitle(/Negrito/i);
    fireEvent.click(boldBtn);
    expect(chainObj.toggleBold).toHaveBeenCalled();

    const italicBtn = getByTitle(/Itálico/i);
    fireEvent.click(italicBtn);
    expect(chainObj.toggleItalic).toHaveBeenCalled();

    const spoilerBtn = getByTitle(/Spoiler/i);
    fireEvent.click(spoilerBtn);
    expect(chainObj.toggleSpoiler).toHaveBeenCalled();
  });

  it('renders excel selection buttons for column and row', () => {
    const { getByTitle } = render(<TableToolbar editor={mockEditor} />);

    const selectColBtn = getByTitle(/Selecionar Coluna \(Excel\)/i);
    expect(selectColBtn).toBeInTheDocument();

    const selectRowBtn = getByTitle(/Selecionar Linha \(Excel\)/i);
    expect(selectRowBtn).toBeInTheDocument();

    const selectTabBtn = getByTitle(/Selecionar Tabela Inteira \(Excel\)/i);
    expect(selectTabBtn).toBeInTheDocument();
  });

  it('opens color popover when clicking cell background color button', () => {
    const { getByTitle, getByText } = render(<TableToolbar editor={mockEditor} />);

    const cellBgBtn = getByTitle(/Cor da célula/i);
    fireEvent.click(cellBgBtn);

    expect(getByText(/Cor da Célula \/ Linha \/ Coluna/i)).toBeInTheDocument();
  });

  it('renders move row and column buttons', () => {
    const { getByTitle } = render(<TableToolbar editor={mockEditor} />);

    expect(getByTitle(/Mover linha para cima/i)).toBeInTheDocument();
    expect(getByTitle(/Mover linha para baixo/i)).toBeInTheDocument();
    expect(getByTitle(/Mover coluna para a esquerda/i)).toBeInTheDocument();
    expect(getByTitle(/Mover coluna para a direita/i)).toBeInTheDocument();
  });
});
