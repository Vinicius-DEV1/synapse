import React, { useState, useEffect, useRef } from 'react';
import { Sparkles,     RefreshCw } from 'lucide-react';
import { promptGeminiForChatAnalysis } from '../../services/gemini';
import { useAIActions } from '../../hooks/useAIActions';
import type { ChatMessage } from '../../hooks/useAIActions';
import { ActionCreateCards, ActionDeleteCard, ActionDeleteBulk, ActionEditCards } from './ai-chat/ChatActionBlocks';
import { ChatSetupForm } from './ai-chat/ChatSetupForm';
import { ChatSuggestionsReview } from './ai-chat/ChatSuggestionsReview';
interface AIChatAnalysisViewProps {
  deckId: string;
  prompt: string;
  setPrompt: (p: string) => void;
  selectedModel: string;
  models: any[];
  setSelectedModel: (m: string) => void;
  includeContext: boolean;
  setIncludeContext: (c: boolean) => void;
  getContextData: () => Promise<any>;
  loading: boolean;
  setLoading: (l: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onAddCards: (cards: any[]) => void;
  isGeneratingRef: React.MutableRefObject<boolean>;
  setFooterState: (state: any) => void;
}

export interface ChatSession {
  id: string;
  date: string;
  history: ChatMessage[];
}

export default function AIChatAnalysisView({
  deckId, prompt, setPrompt, selectedModel, models, setSelectedModel,
  includeContext, setIncludeContext, getContextData,
  loading, setLoading, error, setError,
  onAddCards, isGeneratingRef, setFooterState
}: AIChatAnalysisViewProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatPrompt, setChatPrompt] = useState('');
  const [activeReviewAction, setActiveReviewAction] = useState<{ msgIdx: number, actIdx: number } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]); // review mode suggestions
  const [deckCards, setDeckCards] = useState<any[]>([]); // for displaying original card content
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { actionStatus, setActionStatus, handleExecuteAction } = useAIActions(deckId);

  useEffect(() => {
    if (window.api?.anki) {
      window.api.anki.getAllCards(deckId).then(res => {
        setDeckCards(res?.cards || []);
      }).catch(() => {});
    }
  }, [deckId]);

  useEffect(() => {
    const savedSessions = localStorage.getItem(`ai_chat_sessions_${deckId}`);
    let loadedSessions: ChatSession[] = [];
    if (savedSessions) {
      try { loadedSessions = JSON.parse(savedSessions); } catch(e) {}
    } else {
      // Migrate old format
      const oldChat = localStorage.getItem(`ai_chat_${deckId}`);
      if (oldChat) {
        try {
           const history = JSON.parse(oldChat);
           if (history.length > 0) {
              loadedSessions = [{ id: Date.now().toString(), date: new Date().toISOString(), history }];
              localStorage.setItem(`ai_chat_sessions_${deckId}`, JSON.stringify(loadedSessions));
           }
        } catch(e) {}
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

  useEffect(() => {
    if (!activeSessionId && chatHistory.length > 0) {
       const newId = Date.now().toString();
       const newSession = { id: newId, date: new Date().toISOString(), history: chatHistory };
       setSessions(prev => {
         const next = [...prev, newSession];
         localStorage.setItem(`ai_chat_sessions_${deckId}`, JSON.stringify(next));
         return next;
       });
       setActiveSessionId(newId);
    } else if (activeSessionId) {
       setSessions(prev => {
         const next = prev.map(s => s.id === activeSessionId ? { ...s, history: chatHistory } : s);
         localStorage.setItem(`ai_chat_sessions_${deckId}`, JSON.stringify(next));
         return next;
       });
    }
  }, [chatHistory, activeSessionId, deckId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGeneratingRef.current) return;
    
    setLoading(true);
    setError(null);
    isGeneratingRef.current = true;
    
    try {
      const contextData = await getContextData();
      const userMsg: ChatMessage = { role: 'user', content: prompt };
      const newHistory = [userMsg];
      setChatHistory(newHistory);
      setPrompt('');
      
      const formattedHistory: any[] = [];
      const result = await promptGeminiForChatAnalysis(prompt, formattedHistory, contextData, selectedModel);
      
      setChatHistory([...newHistory, { role: 'model', content: result.message, actions: result.actions }]);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatPrompt.trim() || isGeneratingRef.current) return;
    
    isGeneratingRef.current = true;
    setLoading(true);
    setError(null);
    
    const userPrompt = chatPrompt;
    setChatPrompt('');
    
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userPrompt }];
    setChatHistory(newHistory);
    
    try {
      const contextData = await getContextData();
      const historyForApi = newHistory.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.role === 'model' ? JSON.stringify({ message: msg.content, actions: msg.actions }) : msg.content }]
      }));
      
      const result = await promptGeminiForChatAnalysis(userPrompt, historyForApi, contextData, selectedModel);
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        content: result.message, 
        actions: result.actions,
        tokens: result._usage
      }]);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro no chat.');
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const handleClearChat = () => {
    if (activeSessionId) {
      setSessions(prev => {
        const next = prev.filter(s => s.id !== activeSessionId);
        localStorage.setItem(`ai_chat_sessions_${deckId}`, JSON.stringify(next));
        return next;
      });
      setActiveSessionId(null);
    } else {
      localStorage.removeItem(`ai_chat_sessions_${deckId}`);
    }
    setChatHistory([]);
    setActionStatus({});
    setPrompt('');
  };

  const handleAddAll = () => {
     onAddCards(suggestions.map(c => ({
       ...c,
       validation_mode: (c.type === 'typing' || c.type === 'cloze') ? 'ai' : 'exact'
     })));
     setSuggestions([]);
     
     if (activeReviewAction) {
       setChatHistory(oldHistory => {
         const { msgIdx, actIdx } = activeReviewAction;
         return oldHistory.map((msg, i) => {
           if (i !== msgIdx) return msg;
           return {
             ...msg,
             actions: msg.actions?.map((a: any, j: number) =>
               j === actIdx ? { ...a, cards: [] } : a
             )
           };
         });
       });
       setActiveReviewAction(null);
     }
  };

  useEffect(() => {
    setFooterState({
      hasSuggestions: suggestions.length > 0,
      hasChatHistory: chatHistory.length > 0,
      chatPrompt,
      setChatPrompt,
      handleGenerate,
      handleSendChatMessage,
      handleAddAll,
      cancelSuggestions: () => { setSuggestions([]); setActiveReviewAction(null); }
    });
  }, [suggestions, chatHistory, chatPrompt, prompt, selectedModel]);

  if (suggestions.length > 0) {
    return (
      <ChatSuggestionsReview 
        suggestions={suggestions}
        setSuggestions={setSuggestions}
        setActiveReviewAction={setActiveReviewAction}
      />
    );
  }

  if (chatHistory.length > 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={chatScrollRef}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 bg-dark-bg/30 p-3 rounded-xl border border-white/5">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Análise do Baralho
          </h3>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <select 
                className="bg-dark-card border border-white/10 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500/50 text-dark-text"
                value={activeSessionId || ''}
                onChange={(e) => {
                   const id = e.target.value;
                   const session = sessions.find(s => s.id === id);
                   if (session) {
                      setActiveSessionId(id);
                      setChatHistory(session.history);
                   }
                }}
              >
                {sessions.map(s => (
                  <option className="bg-dark-bg text-white" key={s.id} value={s.id}>
                    {new Date(s.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </option>
                ))}
              </select>
            )}
            <button 
              onClick={() => {
                setActiveSessionId(null);
                setChatHistory([]);
                setChatPrompt('');
              }}
              className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors text-xs font-medium whitespace-nowrap"
            >
              + Nova Conversa
            </button>
            <button 
              onClick={handleClearChat}
              className="text-xs flex items-center gap-1 text-dark-subtext hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg ml-2"
              title="Apagar esta conversa"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 flex flex-col gap-2 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-dark-bg border border-white/5 text-dark-text rounded-tl-sm'}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                {msg.tokens && (
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] opacity-40 font-mono flex items-center gap-1" title={`Prompt: ${msg.tokens.promptTokenCount} | Resposta: ${msg.tokens.candidatesTokenCount}`}>
                      ⚡ {msg.tokens.totalTokenCount} tokens
                    </span>
                  </div>
                )}
              </div>
            
            {msg.actions && msg.actions.map((act, actIdx) => {
              const actionKey = `${idx}-${actIdx}`;
              
              if (act.type === 'create') {
                 return <ActionCreateCards key={actIdx} act={act} msgIdx={idx} actIdx={actIdx} actionStatus={actionStatus} actionKey={actionKey} setActiveReviewAction={setActiveReviewAction} setSuggestions={setSuggestions} />;
              }
              if (act.type === 'delete') {
                 return <ActionDeleteCard key={actIdx} act={act} actionStatus={actionStatus} actionKey={actionKey} handleExecuteAction={handleExecuteAction} />;
              }
              if (act.type === 'delete_bulk') {
                 return <ActionDeleteBulk key={actIdx} act={act} actionStatus={actionStatus} actionKey={actionKey} handleExecuteAction={handleExecuteAction} />;
              }
              return null;
            })}

            {/* Handle multiple edits consolidated */}
            {(() => {
              const editActions = msg.actions?.map((act, actIdx) => ({ act, actIdx, actionKey: `${idx}-${actIdx}` })).filter(x => x.act.type === 'edit') || [];
              if (editActions.length === 0) return null;
              return <ActionEditCards editActions={editActions} actionStatus={actionStatus} handleExecuteAction={handleExecuteAction} deckCards={deckCards} />;
            })()}
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3 opacity-70">
            <div className="bg-dark-bg border border-white/5 text-dark-subtext p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <ChatSetupForm 
        prompt={prompt}
        setPrompt={setPrompt}
        selectedModel={selectedModel}
        models={models}
        setSelectedModel={setSelectedModel}
        includeContext={includeContext}
        setIncludeContext={setIncludeContext}
        error={error}
      />
    </div>
  );
}
