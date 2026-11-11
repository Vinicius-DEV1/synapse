import type { Editor } from '@tiptap/react';
import {
  CellSelection,
  TableMap,
  cellAround,
  findTable,
  moveTableColumn,
  moveTableRow,
} from '@tiptap/pm/tables';

export interface SelectionScope {
  type: 'none' | 'cell' | 'row' | 'col' | 'table' | 'multi-cell';
  count: number;
  label: string;
}

/**
 * Finds the nearest table node and its TableMap for the current editor selection.
 */
export function getCurrentTableInfo(editor: Editor) {
  const { state } = editor;
  const { selection } = state;
  const tableData = findTable(selection.$from);
  if (!tableData) return null;

  const map = TableMap.get(tableData.node);
  return {
    node: tableData.node,
    pos: tableData.pos,
    start: tableData.start,
    map,
  };
}

/**
 * Returns the current selection scope (cell, row, column, whole table, or multiple cells).
 */
export function getSelectionScope(editor: Editor): SelectionScope {
  const { selection } = editor.state;

  if (selection instanceof CellSelection) {
    let cellCount = 0;
    selection.forEachCell(() => {
      cellCount++;
    });

    const info = getCurrentTableInfo(editor);
    const totalCells = info ? info.map.width * info.map.height : 0;

    if (totalCells > 0 && cellCount >= totalCells) {
      return { type: 'table', count: cellCount, label: 'Tabela inteira' };
    }
    if (selection.isColSelection()) {
      return { type: 'col', count: cellCount, label: `Coluna (${cellCount} células)` };
    }
    if (selection.isRowSelection()) {
      return { type: 'row', count: cellCount, label: `Linha (${cellCount} células)` };
    }
    return { type: 'multi-cell', count: cellCount, label: `${cellCount} células` };
  }

  if (editor.isActive('table')) {
    return { type: 'cell', count: 1, label: 'Célula' };
  }

  return { type: 'none', count: 0, label: '' };
}

/**
 * Selects the entire column containing the current cursor/cell.
 */
export function selectCurrentColumn(editor: Editor): boolean {
  try {
    const { state, view } = editor;
    const $cell = cellAround(state.selection.$from);
    if (!$cell) return false;

    const sel = CellSelection.colSelection($cell);
    view.dispatch(state.tr.setSelection(sel));
    view.focus();
    return true;
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao selecionar coluna:', err);
    return false;
  }
}

/**
 * Selects the entire row containing the current cursor/cell.
 */
export function selectCurrentRow(editor: Editor): boolean {
  try {
    const { state, view } = editor;
    const $cell = cellAround(state.selection.$from);
    if (!$cell) return false;

    const sel = CellSelection.rowSelection($cell);
    view.dispatch(state.tr.setSelection(sel));
    view.focus();
    return true;
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao selecionar linha:', err);
    return false;
  }
}

/**
 * Selects all cells in the current table.
 */
export function selectEntireTable(editor: Editor): boolean {
  try {
    const info = getCurrentTableInfo(editor);
    if (!info) return false;

    const { start, map, node } = info;
    const { doc } = editor.state;
    const topLeft = start + map.positionAt(0, 0, node);
    const bottomRight = start + map.positionAt(map.height - 1, map.width - 1, node);

    const sel = new CellSelection(doc.resolve(topLeft), doc.resolve(bottomRight));
    editor.view.dispatch(editor.state.tr.setSelection(sel));
    editor.view.focus();
    return true;
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao selecionar tabela inteira:', err);
    return false;
  }
}

/**
 * Selects a specific column by 0-based column index.
 */
export function selectColumnAtIndex(editor: Editor, colIndex: number): boolean {
  try {
    const info = getCurrentTableInfo(editor);
    if (!info) return false;

    const { start, map, node } = info;
    if (colIndex < 0 || colIndex >= map.width) return false;

    const anchorPos = start + map.positionAt(0, colIndex, node);
    const headPos = start + map.positionAt(map.height - 1, colIndex, node);

    const sel = CellSelection.colSelection(editor.state.doc.resolve(anchorPos), editor.state.doc.resolve(headPos));
    editor.view.dispatch(editor.state.tr.setSelection(sel));
    editor.view.focus();
    return true;
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao selecionar coluna por índice:', err);
    return false;
  }
}

/**
 * Selects a specific row by 0-based row index.
 */
export function selectRowAtIndex(editor: Editor, rowIndex: number): boolean {
  try {
    const info = getCurrentTableInfo(editor);
    if (!info) return false;

    const { start, map, node } = info;
    if (rowIndex < 0 || rowIndex >= map.height) return false;

    const anchorPos = start + map.positionAt(rowIndex, 0, node);
    const headPos = start + map.positionAt(rowIndex, map.width - 1, node);

    const sel = CellSelection.rowSelection(editor.state.doc.resolve(anchorPos), editor.state.doc.resolve(headPos));
    editor.view.dispatch(editor.state.tr.setSelection(sel));
    editor.view.focus();
    return true;
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao selecionar linha por índice:', err);
    return false;
  }
}

/**
 * Retrieves the currently active rectangular cell bounds in the table (left, top, right, bottom)
 * along with the total column and row count.
 */
export function getSelectedTableRect(editor: Editor): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  totalCols: number;
  totalRows: number;
} | null {
  try {
    const info = getCurrentTableInfo(editor);
    if (!info) return null;
    const { selection } = editor.state;
    const { start, map } = info;

    if (selection instanceof CellSelection) {
      const rect = map.rectBetween(selection.$anchorCell.pos - start, selection.$headCell.pos - start);
      return {
        ...rect,
        totalCols: map.width,
        totalRows: map.height,
      };
    }

    const $cell = cellAround(selection.$from);
    if ($cell) {
      const rect = map.findCell($cell.pos - start);
      return {
        ...rect,
        totalCols: map.width,
        totalRows: map.height,
      };
    }

    return null;
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao obter retângulo da tabela:', err);
    return null;
  }
}

/**
 * Moves a column from source index to target index.
 */
export function moveColumnAtIndex(editor: Editor, fromIndex: number, toIndex: number): boolean {
  try {
    const info = getCurrentTableInfo(editor);
    if (!info) return false;

    const { map } = info;
    if (
      fromIndex < 0 ||
      fromIndex >= map.width ||
      toIndex < 0 ||
      toIndex >= map.width ||
      fromIndex === toIndex
    ) {
      return false;
    }

    // Ensure editor selection is inside the table on the source column
    selectColumnAtIndex(editor, fromIndex);

    const cmd = moveTableColumn({
      from: fromIndex,
      to: toIndex,
      select: true,
    });

    const result = cmd(editor.state, editor.view.dispatch);
    if (result) {
      editor.view.focus();
    }
    return Boolean(result);
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao mover coluna:', err);
    return false;
  }
}

/**
 * Moves a row from source index to target index.
 */
export function moveRowAtIndex(editor: Editor, fromIndex: number, toIndex: number): boolean {
  try {
    const info = getCurrentTableInfo(editor);
    if (!info) return false;

    const { map } = info;
    if (
      fromIndex < 0 ||
      fromIndex >= map.height ||
      toIndex < 0 ||
      toIndex >= map.height ||
      fromIndex === toIndex
    ) {
      return false;
    }

    // Ensure editor selection is inside the table on the source row
    selectRowAtIndex(editor, fromIndex);

    const cmd = moveTableRow({
      from: fromIndex,
      to: toIndex,
      select: true,
    });

    const result = cmd(editor.state, editor.view.dispatch);
    if (result) {
      editor.view.focus();
    }
    return Boolean(result);
  } catch (err) {
    console.error('[tableSelectionUtils] Erro ao mover linha:', err);
    return false;
  }
}

/**
 * Moves the currently selected column (or column containing the cursor) left or right.
 */
export function moveCurrentColumn(editor: Editor, direction: 'left' | 'right'): boolean {
  const rect = getSelectedTableRect(editor);
  if (!rect) return false;
  const targetCol = direction === 'left' ? rect.left - 1 : rect.right;
  if (targetCol < 0 || targetCol >= rect.totalCols) return false;
  return moveColumnAtIndex(editor, rect.left, targetCol);
}

/**
 * Moves the currently selected row (or row containing the cursor) up or down.
 */
export function moveCurrentRow(editor: Editor, direction: 'up' | 'down'): boolean {
  const rect = getSelectedTableRect(editor);
  if (!rect) return false;
  const targetRow = direction === 'up' ? rect.top - 1 : rect.bottom;
  if (targetRow < 0 || targetRow >= rect.totalRows) return false;
  return moveRowAtIndex(editor, rect.top, targetRow);
}

/**
 * Checks if the current column can be moved in the given direction.
 */
export function canMoveCurrentColumn(editor: Editor, direction: 'left' | 'right'): boolean {
  const rect = getSelectedTableRect(editor);
  if (!rect) return false;
  return direction === 'left' ? rect.left > 0 : rect.right < rect.totalCols;
}

/**
 * Checks if the current row can be moved in the given direction.
 */
export function canMoveCurrentRow(editor: Editor, direction: 'up' | 'down'): boolean {
  const rect = getSelectedTableRect(editor);
  if (!rect) return false;
  return direction === 'up' ? rect.top > 0 : rect.bottom < rect.totalRows;
}

/**
 * Calculates the destination index when dropping a column or row before or after targetIndex.
 * Returns null if the drop is a no-op (same position).
 */
export function computeDropIndex(
  fromIndex: number,
  targetIndex: number,
  dropPosition: 'before' | 'after'
): number | null {
  if (targetIndex > fromIndex) {
    const to = dropPosition === 'before' ? targetIndex - 1 : targetIndex;
    return to === fromIndex ? null : to;
  } else if (targetIndex < fromIndex) {
    const to = dropPosition === 'before' ? targetIndex : targetIndex + 1;
    return to === fromIndex ? null : to;
  }
  return null;
}

/**
 * Applies a text or cell format command to the current selection, correctly handling
 * both CellSelection (entire row, column, or table) and standard inline text selections.
 */
export function applyFormatToTableSelection(editor: Editor, command: string, value?: string) {
  const { state, view } = editor;
  const { selection } = state;

  if (selection instanceof CellSelection) {
    if (command === 'backgroundColor') {
      const colorVal = value === 'transparent' ? null : value || null;
      editor.chain().focus().setCellAttribute('backgroundColor', colorVal).run();
      return;
    }

    if (command === 'clearFormatting') {
      let tr = state.tr;
      selection.forEachCell((cell, pos) => {
        const from = pos + 1;
        const to = pos + cell.nodeSize - 1;
        if (from < to) {
          tr = tr.removeMark(from, to);
        }
      });
      view.dispatch(tr);
      return;
    }

    // Mapping of formatting commands to schema mark names
    const markNameMap: Record<string, string> = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      strike: 'strike',
      code: 'code',
      spoiler: 'spoiler',
      highlight: 'highlight',
      color: 'textStyle',
    };

    const markName = markNameMap[command];
    if (markName && state.schema.marks[markName]) {
      const markType = state.schema.marks[markName];
      let tr = state.tr;

      // Check whether mark is already active across cells to toggle it off, or apply it
      let shouldAdd = true;
      if (['bold', 'italic', 'underline', 'strike', 'code', 'spoiler'].includes(command)) {
        shouldAdd = !editor.isActive(command);
      }

      selection.forEachCell((cell, pos) => {
        const from = pos + 1;
        const to = pos + cell.nodeSize - 1;
        if (from < to) {
          if (shouldAdd) {
            let mark;
            if (command === 'highlight' && value) {
              mark = markType.create({ color: value });
            } else if (command === 'color' && value && value !== 'inherit') {
              mark = markType.create({ color: value });
            } else {
              mark = markType.create();
            }
            tr = tr.addMark(from, to, mark);
          } else {
            tr = tr.removeMark(from, to, markType);
          }
        }
      });

      view.dispatch(tr);
      return;
    }
  }

  // Normal inline selection or cursor in a single cell
  switch (command) {
    case 'bold':
      editor.chain().focus().toggleBold().run();
      break;
    case 'italic':
      editor.chain().focus().toggleItalic().run();
      break;
    case 'underline':
      editor.chain().focus().toggleUnderline().run();
      break;
    case 'strike':
      editor.chain().focus().toggleStrike().run();
      break;
    case 'code':
      editor.chain().focus().toggleCode().run();
      break;
    case 'spoiler':
      editor.chain().focus().toggleSpoiler().run();
      break;
    case 'highlight':
      if (value) {
        editor.chain().focus().toggleHighlight({ color: value }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
      break;
    case 'color':
      if (value && value !== 'inherit') {
        editor.chain().focus().setColor(value).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
      break;
    case 'backgroundColor': {
      const colorVal = value === 'transparent' ? null : value || null;
      editor.chain().focus().setCellAttribute('backgroundColor', colorVal).run();
      break;
    }
    case 'clearFormatting':
      editor.chain().focus().unsetAllMarks().run();
      break;
  }
}
