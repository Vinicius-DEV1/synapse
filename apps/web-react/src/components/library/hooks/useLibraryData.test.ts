import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLibraryData } from './useLibraryData';
import { getDriveCredentials } from '../../../services/drive';

vi.mock('../../../services/drive', () => ({
  getDriveCredentials: vi.fn(),
}));

vi.mock('../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('useLibraryData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDriveCredentials as any).mockResolvedValue({ token: null });
    
    // Mock window.api.library
    (window as any).api = {
      library: {
        getBooks: vi.fn().mockResolvedValue([{ id: '1', title: 'Test Book' }]),
        getCollections: vi.fn().mockResolvedValue([]),
        getBookCollections: vi.fn().mockResolvedValue([]),
      }
    };
  });

  it('loads data on mount', async () => {
    const { result } = renderHook(() => useLibraryData(null));
    
    expect(result.current.loading).toBe(true);
    
    // Wait for the promises to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.books).toHaveLength(1);
    expect(result.current.books[0].title).toBe('Test Book');
  });

  it('handles sync events', async () => {
    const { result } = renderHook(() => useLibraryData(null));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect((window.api.library.getBooks as any).mock.calls.length).toBe(1);

    // Trigger sync event
    await act(async () => {
      window.dispatchEvent(new Event('caderno-sync-complete'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should reload data
    expect((window.api.library.getBooks as any).mock.calls.length).toBe(2);
  });
});
