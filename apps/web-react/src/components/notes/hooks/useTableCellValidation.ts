import { useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import {
  validateCellInput,
  parseSelectOptions,
  normalizeCheckboxValue,
  type TableColumnType,
} from '../components/table/tableColumnTypes';

const TABLE_NODE_NAMES = new Set(['table', 'tableRow', 'tableCell', 'tableHeader']);

function isTableNodeName(name: string | undefined): boolean {
  return Boolean(name && TABLE_NODE_NAMES.has(name));
}

function positionTouchesTable(doc: ProseMirrorNode, pos: number): boolean {
  const safePos = Math.max(0, Math.min(pos, doc.content.size));
  const nodeAt = doc.nodeAt(safePos);
  if (isTableNodeName(nodeAt?.type.name)) {
    return true;
  }
  const $pos = doc.resolve(safePos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    if (isTableNodeName($pos.node(depth).type.name)) {
      return true;
    }
  }
  return false;
}

export function transactionTouchesTable(doc: ProseMirrorNode, transaction: Transaction): boolean {
  // Check pos-based steps (e.g. AttrStep from setNodeMarkup when changing columnType) whose StepMap is empty.
  for (let i = 0; i < transaction.steps.length; i++) {
    const step = transaction.steps[i];
    if ('pos' in step && typeof step.pos === 'number') {
      const mappedPos = transaction.mapping.slice(i + 1).map(step.pos);
      if (positionTouchesTable(doc, mappedPos)) {
        return true;
      }
    }
  }

  const { maps } = transaction.mapping;
  if (maps.length === 0) {
    return true;
  }

  let touchesTable = false;
  for (let i = 0; i < maps.length && !touchesTable; i++) {
    const map = maps[i];
    map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      if (touchesTable) return;
      const mappedFrom = transaction.mapping.slice(i + 1).map(newStart);
      const mappedTo = transaction.mapping.slice(i + 1).map(newEnd);
      const safeFrom = Math.max(0, Math.min(mappedFrom, doc.content.size));
      const safeTo = Math.max(safeFrom, Math.min(mappedTo, doc.content.size));

      // Handle point-deletions (safeFrom === safeTo) where doc.nodesBetween may skip boundary positions.
      if (positionTouchesTable(doc, safeFrom)) {
        touchesTable = true;
        return;
      }

      if (safeTo > safeFrom) {
        doc.nodesBetween(safeFrom, safeTo, (node) => {
          if (isTableNodeName(node.type.name)) {
            touchesTable = true;
            return false;
          }
          return !touchesTable;
        });
      }
    });
  }

  return touchesTable;
}

const VALIDATION_CLASSES = [
  'table-cell-invalid',
  'table-cell-checkbox',
  'table-cell-checkbox-checked',
  'table-cell-checkbox-unchecked',
  'table-cell-select',
  'table-cell-select-valid',
  'table-cell-date',
  'table-cell-typed',
] as const;

type ValidationClass = (typeof VALIDATION_CLASSES)[number];

const VALIDATION_DEBOUNCE_MS = 120;

/**
 * Syncs only the changed validation classes on a cell, avoiding unconditional
 * remove+add class churn and unnecessary style invalidations.
 */
function syncCellValidationClasses(
  cell: HTMLTableCellElement,
  desired: ReadonlySet<ValidationClass>
): void {
  const { classList } = cell;
  for (let i = 0; i < VALIDATION_CLASSES.length; i++) {
    const cls = VALIDATION_CLASSES[i];
    const shouldHave = desired.has(cls);
    const hasIt = classList.contains(cls);
    if (shouldHave && !hasIt) {
      classList.add(cls);
    } else if (!shouldHave && hasIt) {
      classList.remove(cls);
    }
  }
}

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

function validateTableElement(table: HTMLTableElement): void {
  const columnConfigs = getTableColumnConfigs(table);
  const rows = table.querySelectorAll<HTMLTableRowElement>('tr');
  const desired = new Set<ValidationClass>();

  // Skip header row (index 0)
  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const cells = rows[rowIdx].querySelectorAll<HTMLTableCellElement>('td');

    cells.forEach((cell, colIdx) => {
      desired.clear();
      const config = columnConfigs[colIdx];
      const type = config?.type || 'text';
      const options = config?.options || [];

      if (type !== 'text') {
        desired.add('table-cell-typed');
        const text = cell.textContent?.trim() ?? '';

        if (type === 'checkbox') {
          desired.add('table-cell-checkbox');
          if (text !== '') {
            desired.add(
              normalizeCheckboxValue(text)
                ? 'table-cell-checkbox-checked'
                : 'table-cell-checkbox-unchecked'
            );
          }
        } else if (type === 'select') {
          desired.add('table-cell-select');
          if (text !== '') {
            desired.add(
              validateCellInput('select', text, options)
                ? 'table-cell-select-valid'
                : 'table-cell-invalid'
            );
          }
        } else if (type === 'date') {
          desired.add('table-cell-date');
          if (text !== '' && !validateCellInput('date', text)) {
            desired.add('table-cell-invalid');
          }
        } else if (text !== '' && !validateCellInput(type, text, options)) {
          desired.add('table-cell-invalid');
        }
      }

      syncCellValidationClasses(cell, desired);
    });
  }
}

function getActiveTableDom(editor: Editor): HTMLTableElement | null {
  try {
    const domAt = editor.view.domAtPos(editor.state.selection.from);
    const node = domAt.node;
    const el = node instanceof Element ? node : node.parentElement;
    return el?.closest('table') ?? null;
  } catch {
    const sel = window.getSelection();
    if (!sel?.anchorNode) return null;
    const el = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
    return el?.closest('table') ?? null;
  }
}

/**
 * Applies visual validation decorations to table cells based on their column type.
 *
 * Optimizations:
 * - Skips work entirely when inactive or when the document contains no tables
 * - Early exits transactions that do not affect tables
 * - Scopes validation to only the actively edited table when cursor is inside one
 * - Debounces rapid keystrokes and batches DOM writes in requestAnimationFrame
 * - Diffs CSS classes per cell instead of unconditional remove+add churn
 */
export function useTableCellValidation(editor: Editor | null, isActive: boolean = true): void {
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTableRef = useRef<HTMLTableElement | 'all' | null>(null);

  const applyValidation = useCallback(() => {
    rafRef.current = null;
    if (!editor || editor.isDestroyed) return;

    const target = pendingTableRef.current;
    pendingTableRef.current = null;

    if (target && target !== 'all' && target.isConnected) {
      validateTableElement(target);
      return;
    }

    const editorDom = editor.view.dom;
    const tables = editorDom.getElementsByTagName('table');
    if (tables.length === 0) return;

    for (let i = 0; i < tables.length; i++) {
      validateTableElement(tables[i]);
    }
  }, [editor]);

  const scheduleValidation = useCallback(
    (target: HTMLTableElement | 'all', immediate = false) => {
      // Escalate to 'all' if multiple different tables or full doc were dirtied
      if (pendingTableRef.current === 'all' || target === 'all') {
        pendingTableRef.current = 'all';
      } else if (pendingTableRef.current && pendingTableRef.current !== target) {
        pendingTableRef.current = 'all';
      } else {
        pendingTableRef.current = target;
      }

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const enqueueRaf = () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(applyValidation);
      };

      if (immediate) {
        enqueueRaf();
      } else {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          enqueueRaf();
        }, VALIDATION_DEBOUNCE_MS);
      }
    },
    [applyValidation]
  );

  useEffect(() => {
    if (!editor || !isActive) return;

    const handleTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return;

      const editorDom = editor.view?.dom;
      if (!editorDom) return;
      const tables = editorDom.getElementsByTagName('table');
      if (tables.length === 0) return;

      // Fast path: editing inside a specific table -> validate only that table
      if (editor.isActive('table')) {
        const activeTable = getActiveTableDom(editor);
        if (activeTable) {
          scheduleValidation(activeTable);
          return;
        }
      }

      // Check whether any ProseMirror step (including AttrStep / setNodeMarkup and point-deletions) touched a table
      if (transactionTouchesTable(editor.state.doc, transaction)) {
        scheduleValidation('all');
      }
    };

    editor.on('transaction', handleTransaction);

    // Initial validation pass only if the document already contains tables
    if (editor.view?.dom && editor.view.dom.getElementsByTagName('table').length > 0) {
      scheduleValidation('all', true);
    }

    return () => {
      editor.off('transaction', handleTransaction);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingTableRef.current = null;

      // Clean up all validation classes only when the editor is destroyed/unmounted
      if (editor.isDestroyed) {
        const dom = editor.view?.dom;
        if (dom) {
          dom.querySelectorAll<HTMLTableCellElement>(
            '.table-cell-invalid, .table-cell-checkbox, .table-cell-select, .table-cell-date, .table-cell-typed'
          ).forEach((cell) => {
            cell.classList.remove(...VALIDATION_CLASSES);
          });
        }
      }
    };
  }, [editor, isActive, scheduleValidation]);
}
