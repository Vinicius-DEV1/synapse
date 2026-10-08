import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../../hooks/useAIActions';

export interface ChatSession {
  id: string;
  date: string;
  history: ChatMessage[];
}

export function useAIChatSessions(deckId: string) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load or migrate sessions on deck change
  useEffect(() => {
    const savedSessions = localStorage.getItem(`ai_chat_sessions_${deckId}`);
    let loadedSessions: ChatSession[] = [];
    if (savedSessions) {
      try {
        loadedSessions = JSON.parse(savedSessions);
      } catch (e) {
        console.warn('[AIChatAnalysisView] Failed to parse saved sessions:', e);
      }
    } else {
      // Migrate old format
      const oldChat = localStorage.getItem(`ai_chat_${deckId}`);
      if (oldChat) {
        try {
          const history = JSON.parse(oldChat);
          if (Array.isArray(history) && history.length > 0) {
            loadedSessions = [{ id: Date.now().toString(), date: new Date().toISOString(), history }];
            localStorage.setItem(`ai_chat_sessions_${deckId}`, JSON.stringify(loadedSessions));
          }
        } catch (e) {
          console.warn('[AIChatAnalysisView] Failed to parse old chat history:', e);
        }
      }
    }
    setSessions(loadedSessions);
    if (loadedSessions.length > 0) {
      setActiveSessionId(loadedSessions[loadedSessions.length - 1].id);
      setChatHistory(loadedSessions[loadedSessions.length - 1].history);
    } else {
      setActiveSessionId(null);
      setChatHistory([]);
    }
  }, [deckId]);

  const safeSaveSessions = useCallback((dId: string, sess: ChatSession[]) => {
    try {
      const pruned = sess.slice(-20);
      localStorage.setItem(`ai_chat_sessions_${dId}`, JSON.stringify(pruned));
    } catch (e) {
      console.warn('[AIChat] Failed to persist chat sessions to localStorage:', e);
    }
  }, []);

  // Sync current chatHistory back into sessions and localStorage
  useEffect(() => {
    if (!activeSessionId && chatHistory.length > 0) {
      const newId = Date.now().toString();
      const newSession: ChatSession = { id: newId, date: new Date().toISOString(), history: chatHistory };
      setSessions((prev) => {
        const next = [...prev, newSession];
        safeSaveSessions(deckId, next);
        return next;
      });
      setActiveSessionId(newId);
    } else if (activeSessionId) {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === activeSessionId ? { ...s, history: chatHistory } : s));
        safeSaveSessions(deckId, next);
        return next;
      });
    }
  }, [chatHistory, activeSessionId, deckId, safeSaveSessions]);

  const clearChat = useCallback(() => {
    if (activeSessionId) {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== activeSessionId);
        localStorage.setItem(`ai_chat_sessions_${deckId}`, JSON.stringify(next));
        return next;
      });
      setActiveSessionId(null);
    } else {
      localStorage.removeItem(`ai_chat_sessions_${deckId}`);
    }
    setChatHistory([]);
  }, [activeSessionId, deckId]);

  return {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    chatHistory,
    setChatHistory,
    clearChat,
  };
}
