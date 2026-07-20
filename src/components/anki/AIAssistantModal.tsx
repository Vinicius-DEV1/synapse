import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Plus, Send } from 'lucide-react';
import { fetchGeminiModels, type GeminiModel } from '../../services/gemini';
import { getSettings } from '../../utils/settings';
import AIGenerationView from './AIGenerationView';
import AIChatAnalysisView from './AIChatAnalysisView';
import { Portal } from '../ui/Portal';

interface AIAssistantModalProps {
  deckId: string;
  onClose: () => void;
  onAddCards: (cards: any[]) => void;
}

export default function AIAssistantModal({ deckId, onClose, onAddCards }: AIAssistantModalProps) {
  const [mode, setMode] = useState<'generate' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allDecksMap, setAllDecksMap] = useState<Record<string, string>>({});
  
  const isGeneratingRef = useRef(false);
  const [footerState, setFooterState] = useState<any>({});

  useEffect(() => {
    loadModels();
    getContextData();
  }, [deckId]);

  const loadModels = async () => {
    try {
      const available = await fetchGeminiModels();
      setModels(available);
      const settings = getSettings();
      if (settings.geminiModel && available.find(m => m.name === settings.geminiModel || m.name === `models/${settings.geminiModel}`)) {
        setSelectedModel(settings.geminiModel.startsWith('models/') ? settings.geminiModel : `models/${settings.geminiModel}`);
      } else if (available.length > 0) {
        setSelectedModel(available[0].name);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const getContextData = async () => {
    if (!includeContext || !window.api?.anki) return null;
    const resDecks = await window.api.anki.getDecks();
    const resCards = await window.api.anki.getAllCards(deckId);
    
    const decks = Array.isArray(resDecks) ? resDecks : resDecks.decks;
    const map: Record<string, string> = {};
    decks?.forEach((d: any) => { map[d.id] = d.name; });
    setAllDecksMap(map);
    
    const currentDeck = decks?.find((d: any) => d.id === deckId);
    const subdecks = decks?.filter((d: any) => d.parent_id === deckId) || [];
    const cards = resCards?.cards || [];
    
    return {
      deck_name: currentDeck?.name || 'Desconhecido',
      deck_description: currentDeck?.description || '',
      subdecks: subdecks.map((d: any) => ({ id: d.id, name: d.name, description: d.description })),
      existing_cards: cards.map((c: any) => ({ id: c.id, deck_id: c.deck_id, front: c.front, back: c.back, type: c.card_type, tags: c.tags }))
    };
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onMouseDown={e => e.stopPropagation()}>
      <div className="bg-dark-card border border-indigo-500/30 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col overflow-hidden h-[85vh]">
        
        <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-indigo-900/20 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-300">
             <Sparkles className="w-5 h-5" />
             Assistente IA de Cartões
          </h2>
          <button onClick={onClose} className="p-1 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!(footerState.hasSuggestions || footerState.hasChatHistory) && (
            <div className="px-6 pt-6 shrink-0">
              <div className="flex bg-white/5 rounded-lg p-1">
                <button onClick={() => setMode('generate')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'generate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}>Criar Cartões</button>
                <button onClick={() => setMode('analyze')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'analyze' ? 'bg-indigo-600 text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}>Analisar Baralho (Chat)</button>
              </div>
            </div>
          )}

          {mode === 'generate' ? (
            <AIGenerationView
              deckId={deckId}
              prompt={prompt}
              setPrompt={setPrompt}
              selectedModel={selectedModel}
              models={models}
              setSelectedModel={setSelectedModel}
              includeContext={includeContext}
              setIncludeContext={setIncludeContext}
              getContextData={getContextData}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              allDecksMap={allDecksMap}
              onAddCards={onAddCards}
              onClose={onClose}
              isGeneratingRef={isGeneratingRef}
              setFooterState={setFooterState}
            />
          ) : (
            <AIChatAnalysisView
              deckId={deckId}
              prompt={prompt}
              setPrompt={setPrompt}
              selectedModel={selectedModel}
              models={models}
              setSelectedModel={setSelectedModel}
              includeContext={includeContext}
              setIncludeContext={setIncludeContext}
              getContextData={getContextData}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              onAddCards={onAddCards}
              isGeneratingRef={isGeneratingRef}
              setFooterState={setFooterState}
            />
          )}
        </div>

        {/* FOOTER */}
        <footer className="px-6 py-4 border-t border-white/5 bg-dark-bg/50 shrink-0">
          {!footerState.hasSuggestions && !footerState.hasChatHistory ? (
            <div className="flex justify-end">
              <button 
                onClick={footerState.handleGenerate} 
                disabled={loading || !prompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {mode === 'generate' ? 'Gerar Cartões' : 'Iniciar Análise'}
                  </>
                )}
              </button>
            </div>
          ) : footerState.hasSuggestions ? (
             <div className="flex justify-end gap-3">
               {mode === 'analyze' && (
                 <button 
                   onClick={footerState.cancelSuggestions} 
                   className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                 >
                   Cancelar
                 </button>
               )}
               <button 
                onClick={footerState.handleAddAll} 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Todos
              </button>
             </div>
          ) : (
             <form 
               onSubmit={e => { e.preventDefault(); footerState.handleSendChatMessage(); }}
               className="flex items-center gap-3 relative"
             >
               <input 
                 type="text"
                 value={footerState.chatPrompt || ''}
                 onChange={e => footerState.setChatPrompt(e.target.value)}
                 placeholder="Faça uma pergunta ou peça novos cartões..."
                 className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-dark-text focus:outline-none focus:border-indigo-500 shadow-inner"
                 disabled={loading}
               />
               <button 
                 type="submit"
                 disabled={loading || !(footerState.chatPrompt || '').trim()}
                 className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white p-3 rounded-xl transition-colors shadow-lg"
               >
                 <Send className="w-5 h-5" />
               </button>
             </form>
          )}
        </footer>
      </div>
    </div>
    </Portal>
  );
}
