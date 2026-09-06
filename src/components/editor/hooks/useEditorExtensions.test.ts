import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEditorExtensions } from './useEditorExtensions';

describe('useEditorExtensions', () => {
  it('registers CodeBlockLowlight with Shift-Enter shortcut that inserts newline', () => {
    const { result } = renderHook(() => useEditorExtensions(null));
    const extensions = result.current;

    // Find the codeBlock / codeBlockLowlight extension
    const codeBlockExt = extensions.find(
      (ext: any) => ext.name === 'codeBlock' || ext.name === 'codeBlockLowlight'
    ) as any;

    expect(codeBlockExt).toBeDefined();

    // Check keyboard shortcuts definition
    const shortcuts = typeof codeBlockExt.config.addKeyboardShortcuts === 'function'
      ? codeBlockExt.config.addKeyboardShortcuts.call(codeBlockExt)
      : null;

    expect(shortcuts).toBeDefined();
    expect(shortcuts['Shift-Enter']).toBeDefined();

    // Test Shift-Enter execution when inside code block
    const mockScrollIntoView = vi.fn();
    const mockTr = {
      replaceSelectionWith: vi.fn(() => ({ scrollIntoView: mockScrollIntoView })),
    };
    const mockDispatch = vi.fn();
    const mockSchemaText = vi.fn((t) => ({ type: 'text', text: t }));

    const mockInsideEditor = {
      view: {
        state: {
          selection: {
            $head: {
              depth: 1,
              node: (d: number) => ({
                type: { name: codeBlockExt.name },
              }),
            },
          },
          tr: mockTr,
          schema: {
            text: mockSchemaText,
          },
        },
        dispatch: mockDispatch,
      },
    };

    const handledInside = shortcuts['Shift-Enter']({ editor: mockInsideEditor });
    expect(handledInside).toBe(true);
    expect(mockSchemaText).toHaveBeenCalledWith('\n');
    expect(mockTr.replaceSelectionWith).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();

    // Test Shift-Enter execution when outside code block
    const mockOutsideEditor = {
      view: {
        state: {
          selection: {
            $head: {
              depth: 1,
              node: () => ({
                type: { name: 'paragraph' },
              }),
            },
          },
        },
        dispatch: vi.fn(),
      },
    };

    const handledOutside = shortcuts['Shift-Enter']({ editor: mockOutsideEditor });
    expect(handledOutside).toBe(false);
  });
});
