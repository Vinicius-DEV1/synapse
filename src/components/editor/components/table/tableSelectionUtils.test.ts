import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSelectionScope,
  applyFormatToTableSelection,
} from './tableSelectionUtils';
import { CellSelection } from '@tiptap/pm/tables';

describe('tableSelectionUtils', () => {
  let mockEditor: any;
  let chainObj: any;

  beforeEach(() => {
    vi.clearAllMocks();

    chainObj = {
      focus: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      toggleItalic: vi.fn().mockReturnThis(),
      toggleUnderline: vi.fn().mockReturnThis(),
      toggleStrike: vi.fn().mockReturnThis(),
      toggleCode: vi.fn().mockReturnThis(),
      toggleSpoiler: vi.fn().mockReturnThis(),
      toggleHighlight: vi.fn().mockReturnThis(),
      unsetHighlight: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      unsetColor: vi.fn().mockReturnThis(),
      setCellAttribute: vi.fn().mockReturnThis(),
      unsetAllMarks: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue(true),
    };

    mockEditor = {
      state: {
        selection: {
          $from: { pos: 5 },
          $to: { pos: 5 },
        },
        schema: {
          marks: {
            bold: { create: vi.fn() },
            italic: { create: vi.fn() },
            underline: { create: vi.fn() },
            strike: { create: vi.fn() },
            code: { create: vi.fn() },
            spoiler: { create: vi.fn() },
            highlight: { create: vi.fn() },
            textStyle: { create: vi.fn() },
          },
        },
        tr: {
          addMark: vi.fn().mockReturnThis(),
          removeMark: vi.fn().mockReturnThis(),
          setSelection: vi.fn().mockReturnThis(),
        },
        doc: {
          resolve: vi.fn((pos) => ({ pos })),
        },
      },
      view: {
        dispatch: vi.fn(),
        focus: vi.fn(),
      },
      chain: vi.fn(() => chainObj),
      isActive: vi.fn((name: string) => name === 'table'),
    };
  });

  it('returns scope "cell" when editor is in table but no CellSelection is active', () => {
    const scope = getSelectionScope(mockEditor);
    expect(scope.type).toBe('cell');
    expect(scope.count).toBe(1);
    expect(scope.label).toBe('Célula');
  });

  it('applies formatting commands directly when inside a single cell', () => {
    applyFormatToTableSelection(mockEditor, 'bold');
    expect(chainObj.toggleBold).toHaveBeenCalled();

    applyFormatToTableSelection(mockEditor, 'italic');
    expect(chainObj.toggleItalic).toHaveBeenCalled();

    applyFormatToTableSelection(mockEditor, 'color', '#EF4444');
    expect(chainObj.setColor).toHaveBeenCalledWith('#EF4444');

    applyFormatToTableSelection(mockEditor, 'spoiler');
    expect(chainObj.toggleSpoiler).toHaveBeenCalled();

    applyFormatToTableSelection(mockEditor, 'backgroundColor', 'rgba(239, 68, 68, 0.2)');
    expect(chainObj.setCellAttribute).toHaveBeenCalledWith('backgroundColor', 'rgba(239, 68, 68, 0.2)');
  });

  it('applies batch formatting across cells when selection is a CellSelection', () => {
    const fakeCell = { nodeSize: 10 };
    const mockCellSelection = Object.create(CellSelection.prototype);
    mockCellSelection.forEachCell = (cb: (cell: any, pos: number) => void) => {
      cb(fakeCell, 10);
      cb(fakeCell, 30);
    };
    mockCellSelection.isColSelection = () => true;
    mockCellSelection.isRowSelection = () => false;

    mockEditor.state.selection = mockCellSelection;

    applyFormatToTableSelection(mockEditor, 'bold');
    expect(mockEditor.view.dispatch).toHaveBeenCalled();

    applyFormatToTableSelection(mockEditor, 'backgroundColor', 'rgba(34, 197, 94, 0.2)');
    expect(chainObj.setCellAttribute).toHaveBeenCalledWith('backgroundColor', 'rgba(34, 197, 94, 0.2)');
  });
});
