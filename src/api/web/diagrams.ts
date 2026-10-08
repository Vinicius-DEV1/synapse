import type { IDBPDatabase } from 'idb';
import { encryptText, decryptText } from '../../services/crypto';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { DiagramMeta, DiagramContent, DiagramRecord } from '../../types/diagrams';

export function webDiagramsApi(
  db: IDBPDatabase<CadernoDBSchema>,
  generateId: () => string,
  getMasterKey: () => CryptoKey | null
) {
  return {
    getAll: async (): Promise<DiagramMeta[]> => {
      const all = await db.getAll('diagrams');
      return all
        .filter((d) => !d.deleted_at)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .map((d) => {
          const { content: _content, encrypted_content: _encrypted_content, ...rest } = d;
          return rest;
        });
    },

    getContent: async (id: string): Promise<DiagramContent> => {
      const diagram = await db.get('diagrams', id);
      if (!diagram || diagram.deleted_at) {
        return { content: '', encrypted_content: null };
      }

      let decryptedContent = diagram.content || '';

      if (diagram.encrypted_content) {
        const key = getMasterKey();
        if (key) {
          try {
            decryptedContent = await decryptText(diagram.encrypted_content, key);
          } catch (e) {
            console.error('Failed to decrypt diagram', e);
          }
        }
      }

      return {
        content: decryptedContent,
        encrypted_content: diagram.encrypted_content || null,
      };
    },

    create: async (payload: { title?: string; icon?: string }): Promise<DiagramMeta> => {
      const now = new Date().toISOString();
      const diagram: DiagramRecord = {
        id: generateId(),
        title: payload.title || 'Novo Diagrama',
        icon: payload.icon || '🎨',
        content: '',
        encrypted_content: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      await db.put('diagrams', diagram);
      const { content: _content, encrypted_content: _encrypted_content, ...rest } = diagram;
      return rest;
    },

    update: async (payload: {
      id: string;
      title?: string;
      icon?: string;
      content?: string;
    }): Promise<number> => {
      const existing = await db.get('diagrams', payload.id);
      if (!existing) return 0;

      let hasChanges = false;
      const updated: DiagramRecord = { ...existing };

      if (payload.title !== undefined && payload.title !== existing.title) {
        updated.title = payload.title;
        hasChanges = true;
      }
      if (payload.icon !== undefined && payload.icon !== existing.icon) {
        updated.icon = payload.icon;
        hasChanges = true;
      }

      if (payload.content !== undefined) {
        let encrypted: string | null = null;
        const key = getMasterKey();
        if (key) {
          try {
            encrypted = await encryptText(payload.content, key);
          } catch (e) {
            console.error('Failed to encrypt diagram', e);
          }
        }

        if (encrypted) {
          updated.content = '';
          updated.encrypted_content = encrypted;
        } else {
          updated.content = payload.content;
          updated.encrypted_content = null;
        }
        hasChanges = true;
      }

      if (hasChanges) {
        updated.updated_at = new Date().toISOString();
        await db.put('diagrams', updated);
        return 1;
      }
      return 0;
    },

    delete: async (id: string): Promise<boolean> => {
      const existing = await db.get('diagrams', id);
      if (!existing) return false;
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('diagrams', existing);
      return true;
    },
  };
}
