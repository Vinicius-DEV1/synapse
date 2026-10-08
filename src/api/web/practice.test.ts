import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webPracticeApi } from './practice';

describe('webPracticeApi (IndexedDB)', () => {
  let api: ReturnType<typeof webPracticeApi>;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('tutor_sessions');
    await db.clear('tutor_messages');
    await db.clear('tutor_memories');
    let counter = 0;
    api = webPracticeApi(db, () => `prac-${++counter}`);
  });

  it('creates, retrieves, and updates tutor sessions', async () => {
    const s1 = await api.createSession({
      title: 'Entrevista Frontend',
      started_at: new Date(Date.now() - 60000).toISOString(),
    });
    const s2 = await api.createSession({
      title: 'Entrevista Backend',
      started_at: new Date().toISOString(),
    });

    const sessions = await api.getSessions();
    expect(sessions).toHaveLength(2);
    // Ordered by started_at descending
    expect(sessions[0].id).toBe(s2.id);
    expect(sessions[1].id).toBe(s1.id);

    const updateRes = await api.updateSession({
      id: s1.id,
      title: 'Entrevista React Senior',
      ended_at: new Date().toISOString(),
    });
    expect(updateRes).toBe(1);

    const updatedSessions = await api.getSessions();
    const updatedS1 = updatedSessions.find((s) => s.id === s1.id);
    expect(updatedS1?.title).toBe('Entrevista React Senior');
    expect(updatedS1?.ended_at).toBeTruthy();
  });

  it('creates and retrieves messages scoped to session ordered by created_at', async () => {
    const session = await api.createSession({ title: 'Sessão 1' });

    const m1 = await api.createMessage({
      session_id: session.id,
      role: 'user',
      text_content: 'Olá!',
      created_at: new Date(Date.now() - 5000).toISOString(),
    });
    const m2 = await api.createMessage({
      session_id: session.id,
      role: 'assistant',
      text_content: 'Como posso ajudar com seus estudos?',
      created_at: new Date().toISOString(),
    });

    const msgs = await api.getMessages(session.id);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].id).toBe(m1.id);
    expect(msgs[1].id).toBe(m2.id);
  });

  it('creates and retrieves tutor memories', async () => {
    const mem1 = await api.createMemory({
      category: 'preferência',
      fact: 'Gosta de explicações com exemplos práticos em TypeScript',
    });

    const memories = await api.getMemories();
    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe(mem1.id);
    expect(memories[0].fact).toContain('TypeScript');
  });
});
