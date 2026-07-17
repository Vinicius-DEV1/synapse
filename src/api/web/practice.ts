export const webPracticeApi = (db: any, generateId: () => string) => ({
  getSessions: async () => {
    const all = await db.getAll('tutor_sessions') || [];
    return all.filter((s: any) => !s.deleted_at).sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  },
  createSession: async (session: any) => {
    const newSession = {
      ...session,
      id: session.id || generateId(),
      created_at: new Date().toISOString()
    };
    await db.put('tutor_sessions', newSession);
    return newSession;
  },
  updateSession: async (session: any) => {
    const existing = await db.get('tutor_sessions', session.id);
    if (existing) {
      const updated = { ...existing, ...session };
      await db.put('tutor_sessions', updated);
      return 1;
    }
    return 0;
  },
  getMessages: async (sessionId: string) => {
    const all = await db.getAllFromIndex('tutor_messages', 'session_id', sessionId) || [];
    return all.filter((m: any) => !m.deleted_at).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },
  createMessage: async (msg: any) => {
    const newMsg = {
      ...msg,
      id: msg.id || generateId(),
      created_at: new Date().toISOString()
    };
    await db.put('tutor_messages', newMsg);
    return newMsg;
  },
  getMemories: async () => {
    const all = await db.getAll('tutor_memories') || [];
    return all.filter((m: any) => !m.deleted_at).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  createMemory: async (memory: any) => {
    const newMemory = {
      ...memory,
      id: memory.id || generateId(),
      created_at: new Date().toISOString()
    };
    await db.put('tutor_memories', newMemory);
    return newMemory;
  }
});
