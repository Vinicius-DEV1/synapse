import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webDiagramsApi } from './diagrams';
import { deriveMasterKey } from '../../services/crypto';

describe('webDiagramsApi (IndexedDB)', () => {
  let api: ReturnType<typeof webDiagramsApi>;
  let mockKey: CryptoKey | null = null;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('diagrams');
    let counter = 0;
    mockKey = null;
    api = webDiagramsApi(
      db,
      () => `diag-${++counter}`,
      () => mockKey
    );
  });

  it('creates and retrieves diagrams excluding deleted ones', async () => {
    const diag1 = await api.create({ title: 'Diagrama 1', icon: '📊' });
    const diag2 = await api.create({ title: 'Diagrama 2', icon: '🧠' });

    const all = await api.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((d) => d.id)).toContain(diag1.id);
    expect(all.map((d) => d.id)).toContain(diag2.id);

    // Delete diag1
    const delRes = await api.delete(diag1.id);
    expect(delRes).toBe(true);

    const remaining = await api.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(diag2.id);
  });

  it('updates title, icon and unencrypted content correctly', async () => {
    const created = await api.create({ title: 'Original' });
    expect(created.title).toBe('Original');

    const updateRes = await api.update({
      id: created.id,
      title: 'Atualizado',
      icon: '✨',
      content: '{"shapes": []}',
    });
    expect(updateRes).toBe(1);

    const content = await api.getContent(created.id);
    expect(content.content).toBe('{"shapes": []}');
    expect(content.encrypted_content).toBeNull();
  });

  it('transparently encrypts and decrypts content when master key is present', async () => {
    mockKey = await deriveMasterKey('master-test-password', 'test-salt-1234');

    const created = await api.create({ title: 'Segredo' });
    await api.update({
      id: created.id,
      content: '{"sensitive": "mindmap"}',
    });

    const fetched = await api.getContent(created.id);
    expect(fetched.content).toBe('{"sensitive": "mindmap"}');
    expect(fetched.encrypted_content).toBeTruthy();
  });

  it('returns empty content for non-existent or deleted diagram', async () => {
    const missing = await api.getContent('non-existent');
    expect(missing.content).toBe('');
    expect(missing.encrypted_content).toBeNull();

    const created = await api.create({ title: 'Temp' });
    await api.delete(created.id);

    const deleted = await api.getContent(created.id);
    expect(deleted.content).toBe('');
  });
});
