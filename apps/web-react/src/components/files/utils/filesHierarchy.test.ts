import { describe, it, expect } from 'vitest';
import type { FileFolder, FileItem } from '../../../types';
import {
  formatBytes,
  calculateStorageStats,
  getBreadcrumbTrail,
  getDescendantFolderIds,
  buildFolderTree,
} from './filesHierarchy';

describe('filesHierarchy utilities', () => {
  const mockFolders: FileFolder[] = [
    { id: 'f1', name: 'Documentos', parent_id: null, color: '#3b82f6' },
    { id: 'f2', name: 'Projetos', parent_id: 'f1', color: '#10b981' },
    { id: 'f3', name: '2026', parent_id: 'f2', color: '#f59e0b' },
    { id: 'f4', name: 'Imagens', parent_id: null, color: '#ec4899' },
  ];

  const mockFiles: FileItem[] = [
    {
      id: 'doc1',
      name: 'relatorio.pdf',
      file_type: 'pdf',
      file_size: 1024 * 1024 * 2.5, // 2.5 MB
      local_path: '/path/1',
      drive_file_id: null,
      folder_id: 'f1',
      mime_type: 'application/pdf',
    },
    {
      id: 'doc2',
      name: 'plano.txt',
      file_type: 'text',
      file_size: 512, // 0.5 KB
      local_path: '/path/2',
      drive_file_id: 'drive_123',
      folder_id: 'f2',
      mime_type: 'text/plain',
    },
  ];

  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(500)).toBe('0.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 1.5)).toBe('1.50 GB');
  });

  it('calculates storage statistics accurately', () => {
    const stats = calculateStorageStats(mockFiles);
    expect(stats.fileCount).toBe(2);
    expect(stats.localCount).toBe(1);
    expect(stats.driveCount).toBe(1);
    expect(stats.totalBytes).toBe(1024 * 1024 * 2.5 + 512);
    expect(stats.formattedTotalSize).toContain('2.50 MB');
  });

  it('generates breadcrumb trails from root to target folder', () => {
    const rootTrail = getBreadcrumbTrail(null, mockFolders);
    expect(rootTrail).toEqual([{ id: null, name: 'Início' }]);

    const f1Trail = getBreadcrumbTrail('f1', mockFolders);
    expect(f1Trail).toEqual([
      { id: null, name: 'Início' },
      { id: 'f1', name: 'Documentos' },
    ]);

    const f3Trail = getBreadcrumbTrail('f3', mockFolders);
    expect(f3Trail).toEqual([
      { id: null, name: 'Início' },
      { id: 'f1', name: 'Documentos' },
      { id: 'f2', name: 'Projetos' },
      { id: 'f3', name: '2026' },
    ]);
  });

  it('detects descendant folder IDs to prevent cyclical references', () => {
    const f1Descendants = getDescendantFolderIds('f1', mockFolders);
    expect(f1Descendants.has('f2')).toBe(true);
    expect(f1Descendants.has('f3')).toBe(true);
    expect(f1Descendants.has('f4')).toBe(false);

    const f2Descendants = getDescendantFolderIds('f2', mockFolders);
    expect(f2Descendants.has('f3')).toBe(true);
    expect(f2Descendants.has('f1')).toBe(false);

    const f3Descendants = getDescendantFolderIds('f3', mockFolders);
    expect(f3Descendants.size).toBe(0);
  });

  it('builds a nested folder tree with item counts', () => {
    const tree = buildFolderTree(mockFolders, mockFiles);
    expect(tree.length).toBe(2); // 'Documentos' and 'Imagens'
    const docNode = tree.find((n) => n.folder.id === 'f1');
    expect(docNode).toBeDefined();
    expect(docNode?.itemCount).toBe(1);
    expect(docNode?.children.length).toBe(1); // 'Projetos'

    const projNode = docNode?.children[0];
    expect(projNode?.folder.id === 'f2').toBe(true);
    expect(projNode?.itemCount).toBe(1);
    expect(projNode?.children.length).toBe(1); // '2026'
  });
});
