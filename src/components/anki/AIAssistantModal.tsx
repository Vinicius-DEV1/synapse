import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, Plus, ChevronDown } from 'lucide-react';
import { fetchGeminiModels, promptGeminiForCardSuggestions, type GeminiModel } from '../../services/gemini';
import { getSettings } from '../../utils/settings';

interface AIAssistantModalProps {
  deckId: string;
  onClose: () => void;
  onAddCards: (cards: any[]) => void;
}

export default function AIAssistantModal({ deckId, onClose, onAddCards }: AIAssistantModalProps) {
  const [prompt, setPrompt] = useState('');
  const [maxCards, setMaxCards] = useState(5);
  const [includeContext, setIncludeContext] = useState(true);
  
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    loadModels();
  }, []);

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

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setSuggestions([]);
    
    try {
      let contextData = null;
      if (includeContext && window.api?.anki) {
         const resDecks = await window.api.anki.getDecks();
         const resCards = await window.api.anki.getAllCards(deckId);
         
         const decks = Array.isArray(resDecks) ? resDecks : resDecks.decks;
         const currentDeck = decks?.find((d: any) => d.id === deckId);
         const cards = resCards?.cards || [];
         
         contextData = {
           deck_name: currentDeck?.name || 'Desconhecido',
           deck_description: currentDeck?.description || '',
           existing_cards: cards.map((c: any) => ({ front: c.front, back: c.back, type: c.card_type }))
         };
      }
      
      const result = await promptGeminiForCardSuggestions(prompt, maxCards, contextData, selectedModel);
      setSuggestions(result);
      
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao gerar os cartões.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddAll = () => {
     onAddCards(suggestions);
     onClose();
  };

  const handleAddSingle = (index: number) => {
     onAddCards([suggestions[index]]);
     setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onMouseDown={e => e.stopPropagation()}>
      <div className="bg-dark-card border border-indigo-500/30 w-full max-w-2xl rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col overflow-hidden">
        
        <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-indigo-900/20">
          <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-300">
             <Sparkles className="w-5 h-5" />
             Assistente IA de Cartões
          </h2>
          <button onClick={onClose} className="p-1 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {suggestions.length === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-subtext mb-1">O que você quer estudar?</label>
                <textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Ex: Crie cartões avançados sobre verbos irregulares no passado. Evite os básicos que eu já tenho."
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
                <div>
                  <label className="block text-sm font-medium text-dark-subtext mb-1">Máximo de Cartões</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="50"
                    value={maxCards}
                    onChange={e => setMaxCards(Number(e.target.value))}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-dark-bg p-4 rounded-xl border border-white/5">
                <input 
                  type="checkbox" 
                  id="includeContext" 
                  checked={includeContext}
                  onChange={e => setIncludeContext(e.target.checked)}
                  className="w-4 h-4 text-indigo-500 rounded border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                />
                <label htmlFor="includeContext" className="text-sm text-dark-text cursor-pointer select-none">
                  Enviar contexto do baralho (Evita gerar cartões repetidos)
                </label>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex gap-3 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">{suggestions.length} Cartões Sugeridos</h3>
                <button 
                  onClick={() => setSuggestions([])}
                  className="text-sm text-dark-subtext hover:text-white transition-colors"
                >
                  Gerar novamente
                </button>
              </div>
              
              <div className="space-y-3">
                {suggestions.map((card, idx) => (
                  <div key={idx} className="bg-dark-bg border border-white/5 rounded-xl p-4 flex flex-col gap-2 relative group">
                    <div className="pr-10">
                      <p className="text-sm font-semibold text-indigo-300 mb-1">Frente ({card.type})</p>
                      <p className="text-dark-text">{card.front}</p>
                    </div>
                    {card.type !== 'cloze' && card.back && (
                      <div className="pr-10 mt-2">
                        <p className="text-sm font-semibold text-green-300 mb-1">Verso</p>
                        <p className="text-dark-subtext">{card.back}</p>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleAddSingle(idx)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Adicionar apenas este"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-white/5 bg-dark-bg/50 flex justify-end">
          {suggestions.length === 0 ? (
            <button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Gerando sugestões...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Cartões
                </>
              )}
            </button>
          ) : (
             <button 
              onClick={handleAddAll} 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Todos ({suggestions.length})
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
