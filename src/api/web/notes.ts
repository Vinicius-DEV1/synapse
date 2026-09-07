import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web';
import type { Page, PageMeta, PageHistoryEntry } from '../../types/notes';

export interface UpdatePagePayload {
  id: string;
  title?: string;
  icon?: string;
  content?: string;
  crdt_state?: string | null;
  is_locked?: number;
  password_salt?: string | null;
  encrypted_content?: string | null;
  parent_id?: string | null;
  is_pinned?: number;
  pinned_order?: number;
  cover_image?: string | null;
  description?: string | null;
}

export interface PageOrderUpdate {
  id: string;
  sort_order: number;
}

export const createWebNotesApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) => ({
  getAllPages: async (): Promise<Page[]> => {
    const all = (await db.getAll('pages')) as Page[];
    return all
      .filter((p) => !p.deleted_at)
      .map((p) => {
        const { content: _content, encrypted_content: _encrypted, ...rest } = p;
        if (rest.parent_id === undefined) rest.parent_id = null;
        if (rest.is_pinned === undefined) rest.is_pinned = 0;
        return rest as Page;
      });
  },

  getPageContent: async (id: string): Promise<{ content: string; encrypted_content: string | null }> => {
    const page = (await db.get('pages', id)) as Page | undefined;
    if (!page || page.deleted_at) return { content: '', encrypted_content: null };
    return { content: page.content || '', encrypted_content: page.encrypted_content || null };
  },

  createPage: async ({ parentId, title, icon }: { parentId: string | null; title?: string; icon?: string }): Promise<Page> => {
    const page: Page = {
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

  updatePage: async (page: UpdatePagePayload): Promise<number> => {
    const existing = (await db.get('pages', page.id)) as Page | undefined;
    if (!existing) return 0;

    // Check for actual changes before updating updated_at
    const fieldsToCheck: (keyof UpdatePagePayload)[] = [
      'title',
      'icon',
      'content',
      'encrypted_content',
      'crdt_state',
      'parent_id',
      'is_pinned',
      'pinned_order',
    ];
    let hasChanges = false;

    for (const field of fieldsToCheck) {
      if (page[field] !== undefined && page[field] !== existing[field]) {
        hasChanges = true;
        break;
      }
    }

    const updated: Page = { ...existing, ...page };
    if (hasChanges) {
      updated.updated_at = new Date().toISOString();
    }

    if (page.content !== undefined && page.content !== existing.content) {
      const histId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist_${Date.now()}`;
      await db.put('page_history', {
        id: histId,
        page_id: page.id,
        content: page.content,
        created_at: new Date().toISOString(),
      });
    }

    await db.put('pages', updated);
    return 1;
  },

  deletePage: async (id: string): Promise<boolean> => {
    const existing = (await db.get('pages', id)) as Page | undefined;
    if (!existing) return false;
    existing.deleted_at = new Date().toISOString();
    existing.updated_at = new Date().toISOString();
    await db.put('pages', existing);
    return true;
  },

  getDeletedPages: async (): Promise<PageMeta[]> => {
    const all = (await db.getAll('pages')) as Page[];
    return all
      .filter((p): p is Page & { deleted_at: string } => Boolean(p.deleted_at))
      .sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  },

  restorePage: async (id: string): Promise<boolean> => {
    const existing = (await db.get('pages', id)) as Page | undefined;
    if (!existing) return false;
    existing.deleted_at = null;
    existing.updated_at = new Date().toISOString();
    await db.put('pages', existing);
    return true;
  },

  reorderPages: async (updates: PageOrderUpdate[]): Promise<boolean> => {
    const tx = db.transaction('pages', 'readwrite');
    for (const update of updates) {
      const existing = (await tx.store.get(update.id)) as Page | undefined;
      if (existing) {
        existing.sort_order = update.sort_order;
        existing.updated_at = new Date().toISOString();
        await tx.store.put(existing);
      }
    }
    await tx.done;
    return true;
  },

  getPageHistory: async (pageId: string): Promise<PageHistoryEntry[]> => {
    const history = ((await db.getAllFromIndex('page_history', 'page_id', pageId)) || []) as PageHistoryEntry[];
    return history.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  savePageHistory: async (pageId: string, content: string): Promise<{ success: boolean; id: string }> => {
    const histId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist_${Date.now()}`;
    await db.put('page_history', {
      id: histId,
      page_id: pageId,
      content,
      created_at: new Date().toISOString(),
    });
    return { success: true, id: histId };
  },

  exportBackup: async (): Promise<{ success: boolean; error: string }> => ({
    success: false,
    error: 'Backup não suportado na versão Web',
  }),
});
