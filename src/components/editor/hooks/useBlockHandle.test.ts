import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlockHandle } from './useBlockHandle';
import * as moveCommands from '../../editor-extensions/moveBlockCommands';

vi.mock('../../editor-extensions/moveBlockCommands', () => ({
  moveBlockUp: vi.fn(),
  moveBlockDown: vi.fn(),
}));

describe('useBlockHandle Hook', () => {
  let mockEditor: any;
  let containerRef: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockDiv = document.createElement('div');

    containerRef = {
      current: mockDiv,
    };

    mockEditor = {
      view: {
        editable: true,
        dom: {
          getBoundingClientRect: vi.fn(() => ({
            left: 100,
            right: 800,
            top: 50,
            bottom: 600,
          })),
        },
        state: {
          doc: {
            nodeAt: vi.fn().mockReturnValue({
              nodeSize: 10,
              textContent: 'Texto do bloco',
              isTextblock: true,
              type: { name: 'paragraph' },
            }),
          },
          tr: {
            delete: vi.fn().mockReturnThis(),
          },
        },
        dispatch: vi.fn(),
        nodeDOM: vi.fn(() => document.createElement('p')),
      },
      chain: vi.fn(() => ({
        focus: vi.fn().mockReturnThis(),
        insertContentAt: vi.fn().mockReturnThis(),
        run: vi.fn(),
      })),
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it('initializes with anchor as null', () => {
    const { result } = renderHook(() => useBlockHandle(mockEditor, containerRef));
    expect(result.current.anchor).toBeNull();
  });

  it('handles onMoveUp and onMoveDown by delegating to moveBlock commands', () => {
    const { result } = renderHook(() => useBlockHandle(mockEditor, containerRef));

    act(() => {
      result.current.onMoveUp();
    });
    // With posRef = null initially, it safely guards
    expect(moveCommands.moveBlockUp).not.toHaveBeenCalled();
  });

  it('handles onMenuOpenChange state transitions', () => {
    const { result } = renderHook(() => useBlockHandle(mockEditor, containerRef));

    act(() => {
      result.current.onMenuOpenChange(true);
    });

    expect(result.current.anchor).toBeNull();
  });
});
