export const createWebNotesApi = (db: any, generateId: () => string) => ({
  getAllPages: async () => {
    const all = await db.getAll('pages');
    return all.filter((p: any) => !p.deleted_at).map((p: any) => {
      const { content, encrypted_content, ...rest } = p;
      if (rest.parent_id === undefined) rest.parent_id = null;
      if (rest.is_pinned === undefined) rest.is_pinned = 0;
      return rest;
    });
  },
  getPageContent: async (id: string) => {
    const page = await db.get('pages', id);
    if (!page || page.deleted_at) return { content: '', encrypted_content: null };
    return { content: page.content || '', encrypted_content: page.encrypted_content || null };
  },
  createPage: async ({ parentId, title, icon }: { parentId: string | null; title?: string; icon?: string }) => {
    const page = {
      id: generateId(),
      parent_id: parentId || null,
      title: title || 'Nova Página',
      icon: icon || '📄',
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_locked: 0,
    };
    await db.put('pages', page);
    return page;
  },
  updatePage: async (page: any) => {
    const existing = await db.get('pages', page.id);
    if (!existing) return 0;

    // Check for actual changes before updating updated_at
    const fieldsToCheck = ['title', 'icon', 'content', 'encrypted_content', 'crdt_state', 'parent_id', 'is_pinned', 'pinned_order'];
    let hasChanges = false;

    for (const field of fieldsToCheck) {
      if (page[field] !== undefined && page[field] !== existing[field]) {
        hasChanges = true;
        break;
      }
    }

    const updated = { ...existing, ...page };
    if (hasChanges) {
      updated.updated_at = new Date().toISOString();
    }

    await db.put('pages', updated);
    return 1;
  },
  deletePage: async (id: string) => {
    const existing = await db.get('pages', id);
    if (!existing) return false;
    existing.deleted_at = new Date().toISOString();
    existing.updated_at = new Date().toISOString();
    await db.put('pages', existing);
    return true;
  },
  getDeletedPages: async () => {
    const all = await db.getAll('pages');
    return all.filter((p: any) => p.deleted_at).sort((a: any, b: any) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime());
  },
  restorePage: async (id: string) => {
    const existing = await db.get('pages', id);
    if (!existing) return false;
    existing.deleted_at = null;
    existing.updated_at = new Date().toISOString();
    await db.put('pages', existing);
    return true;
  },
  reorderPages: async (updates: any[]) => {
    const tx = db.transaction('pages', 'readwrite');
    for (const update of updates) {
      const existing = await tx.store.get(update.id);
      if (existing) {
        existing.sort_order = update.sort_order;
        existing.updated_at = new Date().toISOString();
        await tx.store.put(existing);
      }
    }
    await tx.done;
    return true;
  },
  getPageHistory: async (_pageId: string) => [],
  exportBackup: async () => ({ success: false, error: "Backup não suportado na versão Web" }),
});
