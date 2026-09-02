import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webFilesApi } from './files';

describe('webFilesApi (IndexedDB)', () => {
  let api: ReturnType<typeof webFilesApi>;
  let idCounter = 0;
  const generateId = () => `test-id-${++idCounter}`;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('files');
    await db.clear('file_folders');
    await db.clear('file_page_links');
    api = webFilesApi(db, generateId);
  });

  it('creates, retrieves, updates, moves and soft-deletes files', async () => {
    const created = await api.create({
      name: 'document.pdf',
      file_type: 'pdf',
      file_size: 2048,
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('document.pdf');
    expect(created.folder_id).toBeNull();

    let allFiles = await api.getAll();
    expect(allFiles).toHaveLength(1);
    expect(allFiles[0].id).toBe(created.id);

    const byId = await api.getById(created.id);
    expect(byId).not.toBeNull();
    expect(byId?.name).toBe('document.pdf');

    // Update file name
    const updateResult = await api.update({ ...created, name: 'document-renamed.pdf' });
    expect(updateResult).toBe(1);

    const updated = await api.getById(created.id);
    expect(updated?.name).toBe('document-renamed.pdf');

    // Move file into a folder (BUG-01 regression check: must write folder_id)
    const moveResult = await api.move(created.id, 'folder-123');
    expect(moveResult).toBe(true);

    const moved = await api.getById(created.id);
    expect(moved?.folder_id).toBe('folder-123');

    // Soft delete
    const deleteResult = await api.delete(created.id);
    expect(deleteResult).toBe(true);

    allFiles = await api.getAll();
    expect(allFiles).toHaveLength(0);

    const afterDelete = await api.getById(created.id);
    expect(afterDelete).toBeNull();
  });

  it('handles folder CRUD operations', async () => {
    const folder = await api.folders.create({
      name: 'Work Documents',
      color: '#3b82f6',
    });

    expect(folder.id).toBeDefined();
    expect(folder.name).toBe('Work Documents');

    let allFolders = await api.folders.getAll();
    expect(allFolders).toHaveLength(1);

    await api.folders.update({ ...folder, name: 'Work Documents (Archived)' });
    allFolders = await api.folders.getAll();
    expect(allFolders[0].name).toBe('Work Documents (Archived)');

    const deleteResult = await api.folders.delete(folder.id);
    expect(deleteResult).toBe(true);

    allFolders = await api.folders.getAll();
    expect(allFolders).toHaveLength(0);
  });

  it('handles page link operations', async () => {
    const link = await api.links.create({
      file_id: 'file-abc',
      page_id: 'page-xyz',
      link_type: 'upload',
    });

    expect(link.id).toBeDefined();
    expect(link.link_type).toBe('upload');

    let byPage = await api.links.getByPage('page-xyz');
    expect(byPage).toHaveLength(1);

    let byFile = await api.links.getByFile('file-abc');
    expect(byFile).toHaveLength(1);

    await api.links.delete(link.id);

    byPage = await api.links.getByPage('page-xyz');
    expect(byPage).toHaveLength(0);
  });
});
