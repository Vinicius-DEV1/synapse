import { describe, it, expect, beforeEach } from 'vitest';
import { createWebApiMock } from './web-api';
import { getWebDb } from './db-web';

describe('web-api service (IndexedDB implementation)', () => {
  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('pages');
  });

  it('creates and returns the full web API mock implementation', async () => {
    const api = await createWebApiMock();

    expect(api.finance).toBeDefined();
    expect(api.library).toBeDefined();
    expect(api.culture).toBeDefined();
    expect(api.focus).toBeDefined();
    expect(api.sync).toBeDefined();
    expect(api.calendar).toBeDefined();
    expect(api.vault).toBeDefined();
    expect(api.practice).toBeDefined();
    expect(api.anki).toBeDefined();
    expect(api.trash).toBeDefined();
  });

  it('handles page creation, retrieval and updating through web API', async () => {
    const api = await createWebApiMock();

    const created = await api.createPage({ title: 'Web Test Page' });
    expect(created.id).toBeDefined();
    expect(created.title).toBe('Web Test Page');

    const all = await api.getAllPages();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Web Test Page');

    await api.updatePage({ id: created.id, title: 'Updated Web Test Page', content: 'Updated content' });
    const content = await api.getPageContent(created.id);
    expect(content.content).toBe('Updated content');

    const updatedPages = await api.getAllPages();
    expect(updatedPages[0].title).toBe('Updated Web Test Page');
  });
});
