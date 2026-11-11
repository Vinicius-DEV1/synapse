import { invoke } from '@tauri-apps/api/core';

export const tauriPracticeApi = {
  getSessions: async () => await invoke('practice_get_sessions'),
  createSession: async (session: any) => await invoke('practice_create_session', { session }),
  updateSession: async (session: any) => await invoke('practice_update_session', { session }),
  getMessages: async (sessionId: string) => await invoke('practice_get_messages', { sessionId }),
  createMessage: async (msg: any) => await invoke('practice_create_message', { message: msg }),
  getMemories: async () => await invoke('practice_get_memories'),
  createMemory: async (memory: any) => await invoke('practice_create_memory', { memory }),
  deleteMemory: async (id: string) => await invoke('practice_delete_memory', { id }),
};
