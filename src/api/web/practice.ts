import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { TutorSession, TutorMessage, TutorMemory } from '../../types/practice';

export const webPracticeApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) => ({
  getSessions: async (): Promise<TutorSession[]> => {
    const all = (await db.getAll('tutor_sessions')) || [];
    return all
      .filter((s) => !s.deleted_at)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  },

  createSession: async (session: Partial<TutorSession>): Promise<TutorSession> => {
    const now = new Date().toISOString();
    const newSession: TutorSession = {
      id: session.id || generateId(),
      title: session.title || 'Nova Sessão',
      started_at: session.started_at || now,
      ended_at: session.ended_at ?? null,
      custom_prompt: session.custom_prompt ?? null,
      deleted_at: null,
      ...session,
    };
    await db.put('tutor_sessions', newSession);
    return newSession;
  },

  updateSession: async (session: Partial<TutorSession> & { id: string }): Promise<number> => {
    const existing = await db.get('tutor_sessions', session.id);
    if (existing) {
      const updated: TutorSession = { ...existing, ...session };
      await db.put('tutor_sessions', updated);
      return 1;
    }
    return 0;
  },

  getMessages: async (sessionId: string): Promise<TutorMessage[]> => {
    const all = (await db.getAllFromIndex('tutor_messages', 'session_id', sessionId)) || [];
    return all
      .filter((m) => !(m as TutorMessage & { deleted_at?: string | null }).deleted_at)
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  },

  createMessage: async (msg: Partial<TutorMessage> & { session_id: string; role: string; text_content: string }): Promise<TutorMessage> => {
    const newMsg: TutorMessage = {
      id: msg.id || generateId(),
      session_id: msg.session_id,
      role: msg.role,
      text_content: msg.text_content,
      created_at: msg.created_at || new Date().toISOString(),
    };
    await db.put('tutor_messages', newMsg);
    return newMsg;
  },

  getMemories: async (): Promise<TutorMemory[]> => {
    const all = (await db.getAll('tutor_memories')) || [];
    return all
      .filter((m) => !(m as TutorMemory & { deleted_at?: string | null }).deleted_at)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  },

  createMemory: async (memory: Partial<TutorMemory> & { category: string; fact: string }): Promise<TutorMemory> => {
    const newMemory: TutorMemory = {
      id: memory.id || generateId(),
      category: memory.category,
      fact: memory.fact,
      created_at: memory.created_at || new Date().toISOString(),
    };
    await db.put('tutor_memories', newMemory);
    return newMemory;
  },
});
