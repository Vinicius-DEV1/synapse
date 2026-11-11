import type { Editor } from '@tiptap/react';
import { findTable, cellAround, TableMap } from '@tiptap/pm/tables';
import {
  parseSelectOptions,
  normalizeCheckboxValue,
  type TableColumnType,
} from './tableColumnTypes';

export interface CellColumnMeta {
  colIndex: number;
  type: TableColumnType;
  options: string[];
}

/**
 * Extracts column metadata (index, type, select options) for a given table cell.
 */
export function getCellColumnMeta(cellEl: HTMLTableCellElement): CellColumnMeta | null {
  const table = cellEl.closest('table');
  const row = cellEl.parentElement;
  if (!table || !row) return null;

  const colIndex = Array.from(row.children).indexOf(cellEl);
  if (colIndex < 0) return null;

  const headerCells = table.querySelectorAll<HTMLTableCellElement>('tr:first-child > th');
  const th = headerCells[colIndex];
  if (!th) return null;

  const type = (th.getAttribute('data-column-type') as TableColumnType) || 'text';
  const options = type === 'select' ? parseSelectOptions(th.getAttribute('data-column-options')) : [];

  return { colIndex, type, options };
}

/**
 * Finds the exact ProseMirror document position of the header cell at `colIndex`
 * scoped strictly to the given `activeTable` DOM element.
 *
 * This prevents multi-table document corruption where global node iteration
 * would target headers in an earlier table.
 */
export function findHeaderCellPos(
  editor: Editor,
  activeTable: HTMLTableElement,
  colIndex: number
): number | null {
  try {
    const tablePos = editor.view.posAtDOM(activeTable, 0);
    const $pos = editor.state.doc.resolve(tablePos);
    const tableData = findTable($pos);
    if (!tableData) return null;

    const { start, node } = tableData;
    const map = TableMap.get(node);
    if (colIndex < 0 || colIndex >= map.width) return null;

    const cellOffset = map.positionAt(0, colIndex, node);
    return start + cellOffset;
  } catch (err) {
    console.error('[tableColumnUtils] Failed to resolve header cell pos:', err);
    return null;
  }
}

/**
 * Safely replaces the entire text content of a table cell in the ProseMirror document.
 * Creates a single paragraph child containing the new text (or an empty paragraph).
 */
export function updateCellText(
  editor: Editor,
  cellEl: HTMLTableCellElement,
  newText: string
): boolean {
  try {
    const { state, view } = editor;
    const domPos = view.posAtDOM(cellEl, 0);
    const $pos = state.doc.resolve(domPos);

    const $cell = cellAround($pos);
    if (!$cell) return false;

    const cellNode = state.doc.nodeAt($cell.pos);
    if (!cellNode) return false;

    // Content inside cell node starts at pos + 1 and ends at pos + nodeSize - 1
    const from = $cell.pos + 1;
    const to = $cell.pos + cellNode.nodeSize - 1;

    let tr = state.tr;
    const trimmed = newText.trim();

    if (trimmed === '') {
      const emptyParagraph = state.schema.nodes.paragraph.create();
      tr = tr.replaceWith(from, to, emptyParagraph);
    } else {
      const textNode = state.schema.text(trimmed);
      const paragraph = state.schema.nodes.paragraph.create(null, textNode);
      tr = tr.replaceWith(from, to, paragraph);
    }

    view.dispatch(tr);
    view.focus();
    return true;
  } catch (err) {
    console.error('[tableColumnUtils] Failed to update cell text:', err);
    return false;
  }
}

/**
 * Toggles a checkbox cell value between 'Sim' and '' (empty/unchecked).
 */
export function toggleCheckboxCell(
  editor: Editor,
  cellEl: HTMLTableCellElement
): boolean {
  const currentText = cellEl.textContent?.trim() ?? '';
  const isChecked = currentText !== '' && normalizeCheckboxValue(currentText);
  const nextValue = isChecked ? '' : 'Sim';
  return updateCellText(editor, cellEl, nextValue);
}
