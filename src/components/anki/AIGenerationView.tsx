import React, { useRef, useState } from 'react';
import { Sparkles, AlertTriangle, Plus } from 'lucide-react';
import { promptGeminiForCardSuggestions } from '../../services/gemini';

interface AIGenerationViewProps {
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
  allDecksMap: Record<string, string>;
  onAddCards: (cards: any[]) => void;
  onClose: () => void;
  isGeneratingRef: React.MutableRefObject<boolean>;
  setFooterState: (state: any) => void;
}

export default function AIGenerationView({
  deckId, prompt, setPrompt, selectedModel, models, setSelectedModel,
  includeContext, setIncludeContext, getContextData,
  loading, setLoading, error, setError, allDecksMap,
  onAddCards, onClose, isGeneratingRef, setFooterState
}: AIGenerationViewProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [maxCards, setMaxCards] = useState(5);
  const [enableAIAssessment, setEnableAIAssessment] = useState(true);
  const [ignoreSubdeckSuggestions, setIgnoreSubdeckSuggestions] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGeneratingRef.current) return;
    
    setLoading(true);
    setError(null);
    setSuggestions([]);
    isGeneratingRef.current = true;
    
    try {
      const contextData = await getContextData();
      const result = await promptGeminiForCardSuggestions(prompt, maxCards, contextData, selectedModel);
      setSuggestions(result);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const handleAddAll = () => {
     onAddCards(suggestions.map(c => ({
       ...c,
       validation_mode: enableAIAssessment && (c.type === 'typing' || c.type === 'cloze') ? 'ai' : 'exact',
       suggested_deck_id: ignoreSubdeckSuggestions ? undefined : c.suggested_deck_id
     })));
     setSuggestions([]);
     onClose();
  };

  const handleAddSingle = (index: number) => {
     const c = suggestions[index];
     onAddCards([{
       ...c,
       validation_mode: enableAIAssessment && (c.type === 'typing' || c.type === 'cloze') ? 'ai' : 'exact',
       suggested_deck_id: ignoreSubdeckSuggestions ? undefined : c.suggested_deck_id
     }]);
     setSuggestions(prev => {
       const next = prev.filter((_, i) => i !== index);
       if (next.length === 0) onClose();
       return next;
     });
  };

  React.useEffect(() => {
    setFooterState({
      hasSuggestions: suggestions.length > 0,
      hasChatHistory: false,
      handleGenerate,
      handleAddAll,
      cancelSuggestions: () => setSuggestions([])
    });
  }, [suggestions, prompt, selectedModel, maxCards, enableAIAssessment, ignoreSubdeckSuggestions]);

  if (suggestions.length > 0) {
    return (
      <div className="p-6 space-y-4 overflow-y-auto h-full">
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
              <div className="flex items-center justify-between pr-10 mb-1">
                <p className="text-sm font-semibold text-indigo-300">Frente ({card.type})</p>
                {(() => {
                  const targetDeckId = (!ignoreSubdeckSuggestions && card.suggested_deck_id) ? card.suggested_deck_id : deckId;
                  const targetDeckName = allDecksMap[targetDeckId] || 'Baralho pai';
                  return (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Destino: {targetDeckName}
                    </span>
                  );
                })()}
              </div>
              <div className="pr-10">
                <p className="text-dark-text">{card.front}</p>
              </div>
              {card.type !== 'cloze' && card.back && (
                <div className="pr-10 mt-2">
                  <p className="text-sm font-semibold text-green-300 mb-1">Verso</p>
                  <p className="text-dark-subtext">{card.back}</p>
                </div>
              )}
              
              {card.tags && card.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {card.tags.map((tag: string, tagIdx: number) => (
                    <span key={tagIdx} className="px-2 py-0.5 bg-dark-bg text-dark-subtext border border-white/5 rounded-full text-[10px] font-medium">
                      {tag}
                    </span>
                  ))}
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
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
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
              Enviar contexto do baralho (Evita gerar cartões repetidos)
            </label>
          </div>

          <div className="flex items-center gap-3 bg-dark-bg p-4 rounded-xl border border-white/5">
            <input 
              type="checkbox" 
              id="enableAIAssessment" 
              checked={enableAIAssessment}
              onChange={e => setEnableAIAssessment(e.target.checked)}
              className="w-4 h-4 text-indigo-500 rounded border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
            />
            <label htmlFor="enableAIAssessment" className="text-sm text-dark-text cursor-pointer select-none">
              Habilitar Validação por IA para os cartões gerados (Digitação/Cloze)
            </label>
          </div>
          <div className="flex items-center gap-3 bg-dark-bg p-4 rounded-xl border border-white/5">
            <input 
              type="checkbox" 
              id="ignoreSubdeckSuggestions" 
              checked={ignoreSubdeckSuggestions}
              onChange={e => setIgnoreSubdeckSuggestions(e.target.checked)}
              className="w-4 h-4 text-indigo-500 rounded border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
            />
            <label htmlFor="ignoreSubdeckSuggestions" className="text-sm text-dark-text cursor-pointer select-none">
              Ignorar sugestões de sub-baralhos da IA (adicionar tudo no baralho atual)
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
