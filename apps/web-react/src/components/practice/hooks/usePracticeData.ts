import { useState, useCallback, useEffect } from 'react';
import type { TutorSession, TutorMessage, TutorMemory } from '../../../types';

export function usePracticeData(session: TutorSession) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [memories, setMemories] = useState<TutorMemory[]>([]);

  const loadMessages = useCallback(async () => {
    if (!window.api?.practice) return;
    try {
      const msgs = await window.api.practice.getMessages(session.id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, [session.id]);

  const loadMemories = useCallback(async () => {
    if (!window.api?.practice) return;
    try {
      const mems = await window.api.practice.getMemories();
      setMemories(mems);
    } catch (err) {
      console.error('Failed to load memories', err);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    loadMemories();
  }, [loadMessages, loadMemories]);

  const saveMessage = async (role: string, text: string) => {
    if (!window.api?.practice || !text.trim()) return;
    try {
      const newMsg = await window.api.practice.createMessage({
        session_id: session.id,
        role,
        text_content: text
      });
      setMessages(prev => [...prev, newMsg]);
    } catch (err) {
      console.error('Failed to save message', err);
    }
  };

  const saveMemory = async (fact: string, category: string) => {
    if (!window.api?.practice) return;
    try {
      const newMem = await window.api.practice.createMemory({ fact, category });
      setMemories(prev => [newMem, ...prev]);
    } catch (err) {
      console.error('Failed to save memory', err);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!window.api?.practice) return;
    try {
      await window.api.practice.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memory', err);
    }
  };

  return {
    messages,
    setMessages,
    memories,
    setMemories,
    loadMessages,
    loadMemories,
    saveMessage,
    saveMemory,
    deleteMemory
  };
}
