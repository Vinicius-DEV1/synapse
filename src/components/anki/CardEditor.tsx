import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Volume2, Plus, BrainCircuit, Sparkles } from 'lucide-react';
import AIAssistantModal from './AIAssistantModal';

export interface CardDraft {
  front: string;
  back: string;
  extra_note?: string;
  card_type: 'reading' | 'listening' | 'typing' | 'cloze';
  validation_mode?: 'exact' | 'ai';
  source_module: string;
  source_id?: string;
  media_url?: string; // Could be a local path or external URL
  video_clip?: { path: string, startMs: number, endMs: number }; // For video extraction
  tts_text?: string; // For Edge TTS generation
  deck_id?: string;
}

interface CardEditorProps {
  draft: CardDraft;
  onClose: () => void;
  onSaveSuccess?: () => void;
  editingCardId?: string;
  parentDeckId?: string; // Pre-select this deck when creating new card
}

export default function CardEditor({ draft, onClose, onSaveSuccess, editingCardId, parentDeckId }: CardEditorProps) {
  const [front, setFront] = useState(draft.front);
  const [back, setBack] = useState(draft.back);
  const [extraNote, setExtraNote] = useState(draft.extra_note || '');
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(draft.media_url);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [cardType, setCardType] = useState<CardDraft['card_type']>(draft.card_type);
  const [validationMode, setValidationMode] = useState<'exact' | 'ai'>(draft.validation_mode || 'exact');
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDecks();
    if (!mediaUrl && (draft.video_clip || draft.tts_text)) {
      generatePreviewAudio();
    }
  }, []);

  useEffect(() => {
    if (frontRef.current) {
      frontRef.current.style.height = 'auto';
      frontRef.current.style.height = frontRef.current.scrollHeight + 'px';
    }
    if (backRef.current) {
      backRef.current.style.height = 'auto';
      backRef.current.style.height = backRef.current.scrollHeight + 'px';
    }
  }, [front, back]);

  const generatePreviewAudio = async () => {
    setGeneratingAudio(true);
    try {
      if (window.api?.audio) {
        if (draft.video_clip) {
           const { path, startMs, endMs } = draft.video_clip;
           const audioRes = await window.api.audio.extractClip(path, startMs, endMs);
           if (audioRes.success) setMediaUrl(audioRes.filePath);
        } else if (draft.tts_text) {
           const audioRes = await window.api.audio.generateTTS(draft.tts_text, 'en-US');
           if (audioRes.success) setMediaUrl(audioRes.filePath);
        }
      }
    } catch (err) {
      console.error("Audio preview failed:", err);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const loadDecks = async () => {
    if (window.api?.anki) {
      const res = await window.api.anki.getDecks();
      if (res.success && res.decks && res.decks.length > 0) {
        setDecks(res.decks);
        if (draft.deck_id) {
          setSelectedDeck(draft.deck_id);
        } else if (parentDeckId && res.decks.find((d: any) => d.id === parentDeckId)) {
          setSelectedDeck(parentDeckId);
        } else {
          setSelectedDeck(res.decks[0].id);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!selectedDeck) return;
    setLoading(true);

    let finalMediaUrl = mediaUrl;

    try {
      // Audio is now pre-generated on mount. If for some reason it isn't, we'd fallback here, 
      // but let's assume finalMediaUrl is ready from mediaUrl.
      if (!finalMediaUrl && window.api?.audio) {
        if (draft.video_clip) {
           const { path, startMs, endMs } = draft.video_clip;
           const audioRes = await window.api.audio.extractClip(path, startMs, endMs);
           if (audioRes.success) finalMediaUrl = audioRes.filePath;
        } else if (draft.tts_text) {
           const audioRes = await window.api.audio.generateTTS(draft.tts_text, 'en-US');
           if (audioRes.success) finalMediaUrl = audioRes.filePath;
        }
      }

      // 2. Save or Update Note
      if (window.api?.anki) {
        if (editingCardId) {
          const res = await window.api.anki.updateNote(editingCardId, {
             front,
             back,
             extra_note: extraNote,
             media_url: finalMediaUrl,
             validation_mode: validationMode,
             card_type: cardType,
             deck_id: selectedDeck
          });
          if (!res.success) throw new Error(res.error);
        } else {
          const res = await window.api.anki.saveNote({
             deck_id: selectedDeck,
             front,
             back,
             extra_note: extraNote,
             source_module: draft.source_module,
             source_id: draft.source_id,
             media_url: finalMediaUrl,
             card_type: cardType,
             validation_mode: validationMode
          });
          if (!res.success) throw new Error(res.error);
        }

        if (onSaveSuccess) onSaveSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCardsFromAI = async (cards: any[]) => {
    if (!selectedDeck || !window.api?.anki) return;
    setLoading(true);
    let successCount = 0;
    try {
      for (const card of cards) {
        const payload = {
          deck_id: card.suggested_deck_id || selectedDeck,
          front: card.front,
          back: card.back || '',
          card_type: card.type || 'reading',
          source_module: 'manual',
          validation_mode: card.validation_mode || 'exact'
        };
        const res = await window.api.anki.saveNote(payload);
        if (res.success) successCount++;
      }
      if (successCount > 0 && onSaveSuccess) {
        onSaveSuccess();
      }
      // Se não for edição e adicionou pelo menos 1, limpa pra criar mais ou fecha
      if (!editingCardId && successCount > 0) {
        setFront('');
        setBack('');
        setExtraNote('');
        if (frontRef.current) frontRef.current.style.height = 'auto';
        if (backRef.current) backRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error adding AI cards:', error);
      alert('Erro ao salvar cartões da IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-dark-card border border-dark-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <header className="px-6 py-4 border-b border-dark-border flex justify-between items-center bg-dark-bg/50">
          <h2 className="text-lg font-bold flex items-center gap-2">
             <BrainCircuit className="w-5 h-5 text-indigo-400" />
             {editingCardId ? 'Editar Flashcard' : 'Criar Flashcard'}
          </h2>
          <button onClick={onClose} className="p-1 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-subtext mb-1">Baralho</label>
              <select 
                value={selectedDeck}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-indigo-500 appearance-none"
                disabled={loading || decks.length === 0}
              >
                {decks.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-dark-subtext mb-1">Tipo de Cartão</label>
              <select 
                value={cardType}
                onChange={(e) => setCardType(e.target.value as any)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="reading">Leitura (Padrão)</option>
                <option value="listening">Escuta (Áudio)</option>
                <option value="typing">Digitação Livre</option>
                <option value="cloze">Completar Frase (Cloze)</option>
              </select>
            </div>
          </div>
          
          {(cardType === 'typing' || cardType === 'cloze') && (
            <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-300">Validar com Inteligência Artificial</p>
                <p className="text-xs text-indigo-400/70 mt-1">A IA do Gemini irá julgar se a resposta tem o sentido correto, tolerando pequenos erros.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={validationMode === 'ai'}
                  onChange={(e) => setValidationMode(e.target.checked ? 'ai' : 'exact')}
                />
                <div className="w-11 h-6 bg-dark-bg border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          )}

          <div>
             <div className="flex justify-between items-center mb-1">
               <label className="block text-sm font-medium text-dark-subtext">Frente</label>
               {cardType === 'listening' && <Volume2 className="w-4 h-4 text-indigo-400" />}
             </div>
             <textarea 
               ref={frontRef}
               value={front}
               onChange={(e) => setFront(e.target.value)}
               className="w-full min-h-[96px] bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text resize-none focus:outline-none focus:border-indigo-500 text-lg leading-relaxed overflow-hidden"
               placeholder={cardType === 'cloze' ? "Ex: I {{c1::go}} to school" : "Texto principal ou frase..."}
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-dark-subtext mb-1">
               {cardType === 'cloze' ? 'Verso (Opcional - Explicação)' : 'Verso (Resposta)'}
             </label>
             <textarea 
               ref={backRef}
               value={back}
               onChange={(e) => setBack(e.target.value)}
               className="w-full min-h-[96px] bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text resize-none focus:outline-none focus:border-indigo-500 overflow-hidden"
               placeholder={cardType === 'cloze' ? "Explicação opcional para a resposta..." : "Tradução, significado, IPA..."}
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-dark-subtext mb-1">Nota Extra (Opcional)</label>
             <input 
               type="text"
               value={extraNote}
               onChange={(e) => setExtraNote(e.target.value)}
               className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-sm text-dark-text focus:outline-none focus:border-indigo-500"
               placeholder="Contexto adicional, tags, etc."
             />
          </div>

          {(draft.video_clip || draft.tts_text || mediaUrl) && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-center justify-between gap-3 text-sm text-indigo-300">
               <div className="flex items-center gap-3">
                 <Volume2 className="w-5 h-5 flex-shrink-0" />
                 <div>
                   {generatingAudio ? (
                     <p className="animate-pulse">Gerando áudio do flashcard...</p>
                   ) : mediaUrl ? (
                     <p>Áudio pronto! O arquivo será salvo junto ao cartão.</p>
                   ) : (
                     <p>Um clipe de áudio será {draft.video_clip ? 'extraído do vídeo' : 'gerado via Edge TTS'}.</p>
                   )}
                 </div>
               </div>
               
               {mediaUrl && !generatingAudio && (
                 <button 
                   onClick={() => {
                     const audio = new Audio(mediaUrl);
                     audio.play().catch(e => console.error(e));
                   }}
                   className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 rounded-lg transition-colors font-medium border border-indigo-500/30"
                 >
                   <Volume2 className="w-4 h-4" />
                   Ouvir
                 </button>
               )}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-dark-border bg-dark-bg/50 flex justify-between items-center gap-3">
          {!editingCardId ? (
            <button 
              onClick={() => setShowAIAssistant(true)}
              className="px-4 py-2 text-sm font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors rounded-lg flex items-center gap-2 border border-indigo-500/20"
            >
              <Sparkles className="w-4 h-4" />
              Assistente IA
            </button>
          ) : <div></div>}
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-dark-subtext hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={loading || !selectedDeck || !front || (cardType !== 'cloze' && !back)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Flashcard
          </button>
          </div>
        </footer>

      </div>
      
      {showAIAssistant && (
        <AIAssistantModal 
          deckId={selectedDeck} 
          onClose={() => setShowAIAssistant(false)} 
          onAddCards={handleAddCardsFromAI}
        />
      )}
    </div>
  );
}
