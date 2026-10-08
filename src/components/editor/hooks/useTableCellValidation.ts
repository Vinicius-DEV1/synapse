import { useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  validateCellInput,
  parseSelectOptions,
  normalizeCheckboxValue,
  type TableColumnType,
} from '../components/table/tableColumnTypes';

/**
 * Resolves the column type for a given cell element by finding
 * its corresponding header cell in the same column.
 */
function getColumnTypeForCell(
  cell: HTMLTableCellElement
): { type: TableColumnType; options: string[] } {
  const table = cell.closest('table');
  if (!table) return { type: 'text', options: [] };

  // Determine the column index of this cell
  const row = cell.parentElement;
  if (!row) return { type: 'text', options: [] };
  const cellIndex = Array.from(row.children).indexOf(cell);
  if (cellIndex < 0) return { type: 'text', options: [] };

  // Find the header cell at the same column index
  const headerCells = table.querySelectorAll<HTMLTableCellElement>('tr:first-child > th');
  const th = headerCells[cellIndex];
  if (!th) return { type: 'text', options: [] };

  const type = (th.getAttribute('data-column-type') as TableColumnType) || 'text';
  const options = type === 'select' ? parseSelectOptions(th.getAttribute('data-column-options')) : [];

  return { type, options };
}

/**
 * Applies visual validation decorations to table cells based on their column type.
 *
 * This hook:
 * - Scans all <td> cells in the active table
 * - For cells in typed columns (number, date, select), adds CSS classes for
 *   invalid content (subtle red ring)
 * - For checkbox columns, adds a visual checkbox indicator class
 * - Uses requestAnimationFrame to batch DOM reads/writes
 * - Cleans up all decorations on unmount
 *
 * This is a DOM-level decoration approach (not ProseMirror DecorationSet) to
 * avoid the complexity of creating a full ProseMirror plugin for visual-only
 * feedback, and to work seamlessly with the existing TipTap table extensions.
 */
export function useTableCellValidation(editor: Editor | null): void {
  const rafRef = useRef<number | null>(null);

  const applyValidation = useCallback(() => {
    if (!editor || editor.isDestroyed) return;

    const editorDom = editor.view.dom;
    const tables = editorDom.querySelectorAll<HTMLTableElement>('table');

    tables.forEach((table) => {
      const rows = table.querySelectorAll<HTMLTableRowElement>('tr');

      // Skip header row (index 0)
      for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const cells = rows[rowIdx].querySelectorAll<HTMLTableCellElement>('td');

        cells.forEach((cell) => {
          const { type, options } = getColumnTypeForCell(cell);

          // Clean up previous validation classes
          cell.classList.remove(
            'table-cell-invalid',
            'table-cell-checkbox',
            'table-cell-checkbox-checked',
            'table-cell-checkbox-unchecked',
            'table-cell-select',
            'table-cell-select-valid',
            'table-cell-date',
            'table-cell-typed'
          );

          // Skip text columns — they accept anything
          if (type === 'text') return;

          cell.classList.add('table-cell-typed');

          const text = cell.textContent?.trim() ?? '';

          if (type === 'checkbox') {
            cell.classList.add('table-cell-checkbox');
            if (text === '') return;

            if (normalizeCheckboxValue(text)) {
              cell.classList.add('table-cell-checkbox-checked');
            } else {
              cell.classList.add('table-cell-checkbox-unchecked');
            }
            return;
          }

          if (type === 'select') {
            cell.classList.add('table-cell-select');
            if (text !== '') {
              if (validateCellInput('select', text, options)) {
                cell.classList.add('table-cell-select-valid');
              } else {
                cell.classList.add('table-cell-invalid');
              }
            }
            return;
          }

          if (type === 'date') {
            cell.classList.add('table-cell-date');
            if (text !== '' && !validateCellInput('date', text)) {
              cell.classList.add('table-cell-invalid');
            }
            return;
          }

          // Validate number or other typed cells
          if (text !== '' && !validateCellInput(type, text, options)) {
            cell.classList.add('table-cell-invalid');
          }
        });
      }
    });
  }, [editor]);

  const scheduleValidation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(applyValidation);
  }, [applyValidation]);

  useEffect(() => {
    if (!editor) return;

    // Run validation on every transaction (content change)
    const handleTransaction = () => {
      scheduleValidation();
    };

    editor.on('transaction', handleTransaction);

    // Initial validation pass
    scheduleValidation();

    return () => {
      editor.off('transaction', handleTransaction);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // Clean up all validation classes on unmount
      const dom = editor.view?.dom;
      if (dom) {
        dom.querySelectorAll<HTMLTableCellElement>(
          '.table-cell-invalid, .table-cell-checkbox, .table-cell-select, .table-cell-date, .table-cell-typed'
        ).forEach((cell) => {
          cell.classList.remove(
            'table-cell-invalid',
            'table-cell-checkbox',
            'table-cell-checkbox-checked',
            'table-cell-checkbox-unchecked',
            'table-cell-select',
            'table-cell-select-valid',
            'table-cell-date',
            'table-cell-typed'
          );
        });
      }
    };
  }, [editor, scheduleValidation]);
}
