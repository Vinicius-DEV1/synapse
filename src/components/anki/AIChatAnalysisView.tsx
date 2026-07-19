import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, AlertTriangle, Check, Edit3, Trash2, RefreshCw } from 'lucide-react';
import { promptGeminiForChatAnalysis } from '../../services/gemini';
import { useAIActions } from '../../hooks/useAIActions';
import type { ChatMessage } from '../../hooks/useAIActions';

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

export default function AIChatAnalysisView({
  deckId, prompt, setPrompt, selectedModel, models, setSelectedModel,
  includeContext, setIncludeContext, getContextData,
  loading, setLoading, error, setError,
  onAddCards, isGeneratingRef, setFooterState
}: AIChatAnalysisViewProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatPrompt, setChatPrompt] = useState('');
  const [activeReviewAction, setActiveReviewAction] = useState<{ msgIdx: number, actIdx: number } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]); // review mode suggestions
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { actionStatus, setActionStatus, handleExecuteAction } = useAIActions(deckId);

  useEffect(() => {
    const saved = localStorage.getItem(`ai_chat_${deckId}`);
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, [deckId]);

  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(`ai_chat_${deckId}`, JSON.stringify(chatHistory));
    } else {
      localStorage.removeItem(`ai_chat_${deckId}`);
    }
  }, [chatHistory, deckId]);

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
      setChatHistory(prev => [...prev, { role: 'model', content: result.message, actions: result.actions }]);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro no chat.');
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    setActionStatus({});
    setPrompt('');
  };

  const handleAddAll = () => {
     onAddCards(suggestions.map(c => ({
       ...c,
       validation_mode: 'exact'
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
      <div className="p-6 space-y-4 overflow-y-auto h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">{suggestions.length} Cartões Sugeridos</h3>
          <button 
            onClick={() => { setSuggestions([]); setActiveReviewAction(null); }}
            className="text-sm text-dark-subtext hover:text-white transition-colors"
          >
            Voltar ao Chat
          </button>
        </div>
        <div className="space-y-3">
          {suggestions.map((card, idx) => (
            <div key={idx} className="bg-dark-bg border border-white/5 rounded-xl p-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-indigo-300">Frente ({card.type})</p>
              <p className="text-dark-text">{card.front}</p>
              {card.type !== 'cloze' && card.back && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-green-300 mb-1">Verso</p>
                  <p className="text-dark-subtext">{card.back}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chatHistory.length > 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={chatScrollRef}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-white">Análise do Baralho</h3>
          <button 
            onClick={handleClearChat}
            className="text-xs flex items-center gap-1 text-dark-subtext hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Limpar Chat
          </button>
        </div>
        
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-dark-bg border border-white/5 text-dark-text rounded-tl-sm'}`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
            
            {msg.actions && msg.actions.map((act, actIdx) => {
              const actionKey = `${idx}-${actIdx}`;
              const isDone = actionStatus[actionKey];
              
              if (act.type === 'create') {
                 if (!act.cards || act.cards.length === 0) {
                   return (
                     <div key={actIdx} className="mt-2 ml-4 bg-green-500/10 border border-green-500/20 p-4 rounded-xl w-full max-w-[80%] flex items-center gap-3 text-green-300">
                       <Check className="w-5 h-5" />
                       <p className="text-sm font-medium">Cartões adicionados com sucesso!</p>
                     </div>
                   );
                 }
                 return (
                   <div key={actIdx} className="mt-2 ml-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl w-full max-w-[80%] flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <Sparkles className="w-5 h-5 text-indigo-400" />
                       <p className="text-sm font-medium text-indigo-300">A IA sugere criar {act.cards?.length} cartões</p>
                     </div>
                     <button onClick={() => { setActiveReviewAction({ msgIdx: idx, actIdx: actIdx }); setSuggestions([...act.cards]); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow">
                       Revisar e Adicionar
                     </button>
                   </div>
                 );
              }
              if (act.type === 'delete') {
                 return (
                   <div key={actIdx} className="mt-2 ml-4 bg-red-500/10 border border-red-500/20 p-4 rounded-xl w-full max-w-[80%] flex items-center justify-between">
                     <div className="flex items-center gap-3 text-red-400">
                       <Trash2 className="w-5 h-5" />
                       <p className="text-sm font-medium">Sugestão de Exclusão (1 cartão)</p>
                     </div>
                     <button disabled={isDone} onClick={() => handleExecuteAction(act, actionKey)} className="bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow">
                       {isDone ? 'Excluído' : 'Aprovar Exclusão'}
                     </button>
                   </div>
                 );
              }
              if (act.type === 'delete_bulk') {
                 return (
                   <div key={actIdx} className="mt-2 ml-4 bg-red-500/10 border border-red-500/20 rounded-xl w-full max-w-[80%] overflow-hidden flex flex-col">
                      <div className="p-4 flex items-center justify-between border-b border-red-500/10">
                        <div className="flex items-center gap-3 text-red-400">
                          <Trash2 className="w-5 h-5" />
                          <p className="text-sm font-medium">Sugestão de Exclusão ({act.cards_to_delete?.length} cartões)</p>
                        </div>
                        <button disabled={isDone} onClick={() => handleExecuteAction(act, actionKey)} className="bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow">
                          {isDone ? 'Excluídos' : 'Aprovar Exclusão'}
                        </button>
                      </div>
                      <details className="group">
                        <summary className="p-3 text-xs text-red-300/70 cursor-pointer hover:bg-red-500/5 select-none font-medium text-center">Ver motivos das exclusões</summary>
                        <div className="p-4 pt-0 space-y-2">
                          {act.cards_to_delete?.map((item: any, i: number) => (
                             <div key={i} className="text-xs bg-black/20 p-2 rounded text-red-100">
                               <span className="font-semibold opacity-70">Motivo:</span> {item.reason}
                             </div>
                          ))}
                        </div>
                      </details>
                   </div>
                 );
              }
              return null;
            })}

            {/* Handle multiple edits consolidated */}
            {(() => {
              const editActions = msg.actions?.map((act, actIdx) => ({ act, actIdx, actionKey: `${idx}-${actIdx}` })).filter(x => x.act.type === 'edit') || [];
              if (editActions.length === 0) return null;
              
              const allDone = editActions.every(e => actionStatus[e.actionKey]);
              
              return (
                <div className="mt-2 ml-4 bg-blue-500/10 border border-blue-500/20 rounded-xl w-full max-w-[80%] overflow-hidden flex flex-col">
                  <div className="p-4 flex items-center justify-between border-b border-blue-500/10">
                    <div className="flex items-center gap-3 text-blue-300">
                      <Edit3 className="w-5 h-5" />
                      <p className="text-sm font-medium">Sugestão de Edição ({editActions.length} {editActions.length === 1 ? 'cartão' : 'cartões'})</p>
                    </div>
                    <button 
                      disabled={allDone} 
                      onClick={() => { editActions.forEach(e => { if(!actionStatus[e.actionKey]) handleExecuteAction(e.act, e.actionKey) }) }} 
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/50 disabled:text-blue-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow flex items-center gap-2"
                    >
                      {allDone ? <><Check className="w-4 h-4" /> Aplicadas</> : 'Aprovar Todos'}
                    </button>
                  </div>
                  <details className="group">
                    <summary className="p-3 text-xs text-blue-300/70 cursor-pointer hover:bg-blue-500/5 select-none font-medium text-center">Ver detalhes das edições</summary>
                    <div className="p-4 pt-0 space-y-3 max-h-64 overflow-y-auto">
                      {editActions.map((e, i) => (
                        <div key={i} className="bg-black/20 p-3 rounded-lg text-xs space-y-2 relative border border-white/5">
                          {actionStatus[e.actionKey] && (
                            <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">FEITO</div>
                          )}
                          <div><span className="text-blue-300/70 uppercase tracking-wide text-[10px]">Nova Frente</span><p className="text-white mt-0.5">{e.act.new_front}</p></div>
                          {e.act.new_back && <div><span className="text-blue-300/70 uppercase tracking-wide text-[10px]">Novo Verso</span><p className="text-white mt-0.5">{e.act.new_back}</p></div>}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
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
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-subtext mb-1">O que deseja analisar?</label>
          <textarea 
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ex: Analise meus cartões e sugira edições para os mais confusos, ou exclua os redundantes."
            className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text resize-none focus:outline-none focus:border-indigo-500 h-28"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-dark-subtext mb-1">Modelo da IA</label>
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-indigo-500"
            >
              {models.map(m => (
                <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
              ))}
              {models.length === 0 && <option value="">Carregando...</option>}
            </select>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-dark-bg p-4 rounded-xl border border-white/5">
            <input 
              type="checkbox" 
              id="includeContext" 
              checked={includeContext}
              onChange={e => setIncludeContext(e.target.checked)}
              className="w-4 h-4 text-indigo-500 rounded border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
            />
            <label htmlFor="includeContext" className="text-sm text-dark-text cursor-pointer select-none">
              Enviar contexto do baralho (Essencial para análise)
            </label>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
