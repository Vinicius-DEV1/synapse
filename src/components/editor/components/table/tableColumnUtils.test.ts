import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCellColumnMeta,
  findHeaderCellPos,
  updateCellText,
  toggleCheckboxCell,
} from './tableColumnUtils';

describe('tableColumnUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCellColumnMeta', () => {
    it('returns null if cell is not inside a table', () => {
      const cell = document.createElement('td');
      expect(getCellColumnMeta(cell)).toBeNull();
    });

    it('extracts column type and options from header cell', () => {
      const table = document.createElement('table');
      const trHeader = document.createElement('tr');
      const th0 = document.createElement('th');
      th0.setAttribute('data-column-type', 'select');
      th0.setAttribute('data-column-options', JSON.stringify(['Sim', 'Não']));
      trHeader.appendChild(th0);
      table.appendChild(trHeader);

      const trData = document.createElement('tr');
      const td0 = document.createElement('td');
      trData.appendChild(td0);
      table.appendChild(trData);

      const meta = getCellColumnMeta(td0);
      expect(meta).not.toBeNull();
      expect(meta?.colIndex).toBe(0);
      expect(meta?.type).toBe('select');
      expect(meta?.options).toEqual(['Sim', 'Não']);
    });

    it('falls back to text type when attribute is absent', () => {
      const table = document.createElement('table');
      const trHeader = document.createElement('tr');
      const th0 = document.createElement('th');
      trHeader.appendChild(th0);
      table.appendChild(trHeader);

      const trData = document.createElement('tr');
      const td0 = document.createElement('td');
      trData.appendChild(td0);
      table.appendChild(trData);

      const meta = getCellColumnMeta(td0);
      expect(meta).not.toBeNull();
      expect(meta?.type).toBe('text');
      expect(meta?.options).toEqual([]);
    });
  });

  describe('updateCellText and toggleCheckboxCell', () => {
    let mockEditor: any;
    let mockCellEl: HTMLTableCellElement;

    beforeEach(() => {
      mockCellEl = document.createElement('td');
      mockCellEl.textContent = 'Antigo';

      const mockParagraph = { type: 'paragraph' };
      const mockText = { type: 'text', text: 'Novo' };

      const mockResolvedCell = {
        pos: 15,
      };

      const mockRowNode = {
        type: {
          spec: {
            tableRole: 'row',
          },
        },
      };

      const mockDocNode = {
        resolve: vi.fn().mockReturnValue(mockResolvedCell),
      };

      const mockResolvedPos = {
        depth: 3,
        node: vi.fn((depth: number) => (depth === 0 ? mockDocNode : mockRowNode)),
        before: vi.fn().mockReturnValue(15),
        pos: 16,
      };

      mockEditor = {
        state: {
          doc: {
            resolve: vi.fn().mockReturnValue(mockResolvedPos),
            nodeAt: vi.fn().mockReturnValue({
              nodeSize: 20,
              type: { name: 'tableCell' },
            }),
          },
          schema: {
            text: vi.fn().mockReturnValue(mockText),
            nodes: {
              paragraph: {
                create: vi.fn().mockReturnValue(mockParagraph),
              },
            },
          },
          tr: {
            replaceWith: vi.fn().mockReturnThis(),
          },
        },
        view: {
          posAtDOM: vi.fn().mockReturnValue(16),
          dispatch: vi.fn(),
          focus: vi.fn(),
        },
      };
    });

    it('updateCellText replaces cell content with new paragraph and dispatches', () => {
      const result = updateCellText(mockEditor, mockCellEl, 'Opção A');
      expect(result).toBe(true);
      expect(mockEditor.view.dispatch).toHaveBeenCalledTimes(1);
      expect(mockEditor.view.focus).toHaveBeenCalledTimes(1);
    });

    it('toggleCheckboxCell switches empty cell to Sim', () => {
      mockCellEl.textContent = '';
      const result = toggleCheckboxCell(mockEditor, mockCellEl);
      expect(result).toBe(true);
      expect(mockEditor.state.schema.text).toHaveBeenCalledWith('Sim');
    });

    it('toggleCheckboxCell switches Sim to empty string', () => {
      mockCellEl.textContent = 'Sim';
      const result = toggleCheckboxCell(mockEditor, mockCellEl);
      expect(result).toBe(true);
      // Empty string creates empty paragraph without text node
      expect(mockEditor.state.schema.nodes.paragraph.create).toHaveBeenCalled();
    });
  });
});
