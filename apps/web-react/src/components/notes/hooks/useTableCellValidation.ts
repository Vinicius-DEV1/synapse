import { useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  validateCellInput,
  parseSelectOptions,
  normalizeCheckboxValue,
  type TableColumnType,
} from '../components/table/tableColumnTypes';

/**
 * Pre-computes column types and select options once per table header row in O(C).
 */
function getTableColumnConfigs(
  table: HTMLTableElement
): Array<{ type: TableColumnType; options: string[] }> {
  const headerCells = table.querySelectorAll<HTMLTableCellElement>('tr:first-child > th');
  const configs: Array<{ type: TableColumnType; options: string[] }> = [];
  headerCells.forEach((th) => {
    const type = (th.getAttribute('data-column-type') as TableColumnType) || 'text';
    const options =
      type === 'select' ? parseSelectOptions(th.getAttribute('data-column-options')) : [];
    configs.push({ type, options });
  });
  return configs;
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
    if (tables.length === 0) return;

    tables.forEach((table) => {
      const columnConfigs = getTableColumnConfigs(table);
      const rows = table.querySelectorAll<HTMLTableRowElement>('tr');

      // Skip header row (index 0)
      for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const cells = rows[rowIdx].querySelectorAll<HTMLTableCellElement>('td');

        cells.forEach((cell, colIdx) => {
          const config = columnConfigs[colIdx];
          const type = config?.type || 'text';
          const options = config?.options || [];

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

    // Run validation only when document content actually changes
    const handleTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) {
        scheduleValidation();
      }
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
