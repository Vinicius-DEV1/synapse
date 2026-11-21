import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableRow } from '@tiptap/extension-table';
import { TableCell } from '../../editor-extensions/TableCell';
import { TableHeader } from '../../editor-extensions/TableHeader';
import { transactionTouchesTable } from './useTableCellValidation';

function createTableEditor() {
  return new Editor({
    extensions: [
      StarterKit,
      Table,
      TableRow,
      TableHeader,
      TableCell,
    ],
    content:
      '<p>Outside paragraph</p>' +
      '<table><tbody>' +
      '<tr><th><p>Amount</p></th></tr>' +
      '<tr><td><p>abc</p></td></tr>' +
      '</tbody></table>',
  });
}

describe('useTableCellValidation (transactionTouchesTable)', () => {
  it('returns false for edits purely inside a paragraph outside any table', () => {
    const editor = createTableEditor();
    try {
      const tr = editor.state.tr.insertText(' updated', 8);
      const nextDoc = tr.doc;
      expect(transactionTouchesTable(nextDoc, tr)).toBe(false);
    } finally {
      editor.destroy();
    }
  });

  it('returns true when changing tableHeader columnType via setNodeMarkup (AttrStep) while cursor is outside table', () => {
    const editor = createTableEditor();
    try {
      editor.commands.setTextSelection(2);
      expect(editor.isActive('table')).toBe(false);

      let headerPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableHeader') {
          headerPos = pos;
          return false;
        }
        return true;
      });
      expect(headerPos).toBeGreaterThan(0);

      const tr = editor.state.tr.setNodeMarkup(headerPos, undefined, {
        ...editor.state.doc.nodeAt(headerPos)?.attrs,
        columnType: 'number',
      });
      expect(tr.docChanged).toBe(true);
      expect(transactionTouchesTable(tr.doc, tr)).toBe(true);
    } finally {
      editor.destroy();
    }
  });

  it('returns true for pure point-deletions inside a tableCell while selection remains outside', () => {
    const editor = createTableEditor();
    try {
      editor.commands.setTextSelection(2);
      let cellTextFrom = -1;
      let cellTextTo = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableCell') {
          // tableCell -> paragraph -> text "abc"
          cellTextFrom = pos + 2;
          cellTextTo = pos + 2 + node.textContent.length;
          return false;
        }
        return true;
      });
      expect(cellTextFrom).toBeGreaterThan(0);

      const tr = editor.state.tr.delete(cellTextFrom, cellTextTo);
      expect(transactionTouchesTable(tr.doc, tr)).toBe(true);
    } finally {
      editor.destroy();
    }
  });
});
