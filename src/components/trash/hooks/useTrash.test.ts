import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrash } from './useTrash';

vi.mock('../../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    dispatch: vi.fn(),
  })),
}));

describe('useTrash Hook', () => {
  const mockTrashItems = [
    { id: 'item_1', title: 'Nota Antiga', item_type: 'page', deleted_at: '2026-08-20' },
    { id: 'item_2', title: 'Deck Inglês', item_type: 'anki_deck', deleted_at: '2026-08-21' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      trash: {
        getAll: vi.fn().mockResolvedValue(mockTrashItems),
        restore: vi.fn().mockResolvedValue(undefined),
        deletePermanently: vi.fn().mockResolvedValue(undefined),
        empty: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('loads all trash items and filters by category', async () => {
    const { result } = renderHook(() => useTrash());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toHaveLength(2);
    });

    act(() => {
      result.current.setFilter('notes');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].title).toBe('Nota Antiga');
  });

  it('restores an item from trash', async () => {
    const { result } = renderHook(() => useTrash());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleRestore(mockTrashItems[0]);
    });

    expect(window.api.trash.restore).toHaveBeenCalledWith('item_1', 'page');
    expect(result.current.items).toHaveLength(1);
  });

  it('empties trash and purges orphaned image cache', async () => {
    (window as any).api.imageCache = {
      cleanupOrphans: vi.fn().mockResolvedValue(5),
    };

    const { result } = renderHook(() => useTrash());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleEmptyTrash();
    });

    expect(window.api.trash.empty).toHaveBeenCalled();
    expect((window as any).api.imageCache.cleanupOrphans).toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it('permanently deletes page item and triggers imageCache cleanup', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (window as any).api.imageCache = {
      cleanupOrphans: vi.fn().mockResolvedValue(1),
    };

    const { result } = renderHook(() => useTrash());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleHardDelete(mockTrashItems[0]);
    });

    expect(window.api.trash.deletePermanently).toHaveBeenCalledWith('item_1', 'page');
    expect((window as any).api.imageCache.cleanupOrphans).toHaveBeenCalled();
    expect(result.current.items).toHaveLength(1);
  });
});

