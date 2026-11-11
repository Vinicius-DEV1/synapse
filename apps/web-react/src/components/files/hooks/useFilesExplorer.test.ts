import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FileFolder, FileItem } from '../../../types';
import { useFilesExplorer } from './useFilesExplorer';

describe('useFilesExplorer hook', () => {
  const mockFolders: FileFolder[] = [
    { id: 'f1', name: 'Documentos', parent_id: null, color: '#3b82f6' },
    { id: 'f2', name: 'Projetos', parent_id: 'f1', color: '#10b981' },
  ];

  const mockFiles: FileItem[] = [
    {
      id: 'doc1',
      name: 'relatorio.pdf',
      file_type: 'pdf',
      file_size: 2000,
      local_path: '/path/1',
      drive_file_id: null,
      folder_id: null, // root
      mime_type: 'application/pdf',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc2',
      name: 'codigo.ts',
      file_type: 'code',
      file_size: 500,
      local_path: '/path/2',
      drive_file_id: 'drive_1',
      folder_id: 'f1',
      mime_type: 'text/typescript',
      updated_at: new Date().toISOString(),
    },
  ];

  it('manages navigation history correctly', () => {
    const { result } = renderHook(() =>
      useFilesExplorer({
        folders: mockFolders,
        files: mockFiles,
        searchQuery: '',
      })
    );

    expect(result.current.currentFolderId).toBeNull();
    expect(result.current.canGoBack).toBe(false);

    act(() => {
      result.current.navigateToFolder('f1');
    });

    expect(result.current.currentFolderId).toBe('f1');
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(false);

    act(() => {
      result.current.navigateToFolder('f2');
    });

    expect(result.current.currentFolderId).toBe('f2');

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentFolderId).toBe('f1');
    expect(result.current.canGoForward).toBe(true);

    act(() => {
      result.current.goForward();
    });

    expect(result.current.currentFolderId).toBe('f2');

    act(() => {
      result.current.goUpOneLevel();
    });

    expect(result.current.currentFolderId).toBe('f1');
  });

  it('filters files by category correctly', () => {
    const { result } = renderHook(() =>
      useFilesExplorer({
        folders: mockFolders,
        files: mockFiles,
        searchQuery: '',
      })
    );

    // Section 'all'
    act(() => {
      result.current.selectSection('all');
      result.current.setCategoryFilter('pdf');
    });

    expect(result.current.files.length).toBe(1);
    expect(result.current.files[0].name).toBe('relatorio.pdf');

    act(() => {
      result.current.setCategoryFilter('code');
    });

    expect(result.current.files.length).toBe(1);
    expect(result.current.files[0].name).toBe('codigo.ts');

    act(() => {
      result.current.setCategoryFilter('all');
    });

    expect(result.current.files.length).toBe(2);
  });

  it('toggles view mode and sorting', () => {
    const { result } = renderHook(() =>
      useFilesExplorer({
        folders: mockFolders,
        files: mockFiles,
        searchQuery: '',
      })
    );

    act(() => {
      result.current.setViewMode('table');
    });
    expect(result.current.viewMode).toBe('table');

    act(() => {
      result.current.toggleSort('size');
    });
    expect(result.current.sortBy).toBe('size');
    expect(result.current.sortOrder).toBe('asc');

    act(() => {
      result.current.toggleSort('size');
    });
    expect(result.current.sortOrder).toBe('desc');
  });

  it('filters files by searchScope correctly (current vs all)', () => {
    const { result, rerender } = renderHook(
      ({ query }) =>
        useFilesExplorer({
          folders: mockFolders,
          files: mockFiles,
          searchQuery: query,
        }),
      { initialProps: { query: 'codigo' } }
    );

    // Initial folder is null (root). 'codigo.ts' is in 'f1'.
    // With searchScope = 'current', 'codigo.ts' is not in root so 0 results
    expect(result.current.files.length).toBe(0);

    // Switch searchScope to 'all'
    act(() => {
      result.current.setSearchScope('all');
    });

    // Now 'codigo.ts' in 'f1' matches search across the vault!
    expect(result.current.files.length).toBe(1);
    expect(result.current.files[0].name).toBe('codigo.ts');
  });
});
