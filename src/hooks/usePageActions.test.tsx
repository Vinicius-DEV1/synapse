import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StoreProvider } from '../store/useStore';
import { usePageActions } from './usePageActions';

describe('usePageActions hook', () => {
  beforeEach(() => {
    (window as any).api = {
      createPage: vi.fn().mockImplementation(({ parentId }) =>
        Promise.resolve({ id: 'new-page-123', title: 'Untitled', parent_id: parentId })
      ),
      updatePage: vi.fn().mockResolvedValue(undefined),
      deletePage: vi.fn().mockResolvedValue(undefined),
      savePageHistory: vi.fn().mockResolvedValue(undefined),
      sync: {
        getTable: vi.fn().mockResolvedValue([]),
      },
    };
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StoreProvider>{children}</StoreProvider>
  );

  it('creates page and navigates in current tab', async () => {
    const { result } = renderHook(() => usePageActions(), { wrapper });

    await act(async () => {
      await result.current.handleCreatePage(null);
    });

    expect((window as any).api.createPage).toHaveBeenCalledWith({ parentId: null });
  });

  it('updates page title and dispatches update', async () => {
    const { result } = renderHook(() => usePageActions(), { wrapper });

    await act(async () => {
      await result.current.handleUpdatePage('page-1', { title: 'Updated Title' });
    });

    expect((window as any).api.updatePage).toHaveBeenCalledWith({
      id: 'page-1',
      title: 'Updated Title',
    });
  });

  it('deletes page and calls deletePage API', async () => {
    const { result } = renderHook(() => usePageActions(), { wrapper });

    await act(async () => {
      await result.current.handleDeletePage('page-to-delete');
    });

    expect((window as any).api.deletePage).toHaveBeenCalledWith('page-to-delete');
  });
});
