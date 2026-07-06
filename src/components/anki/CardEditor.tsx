import React, { useState, useEffect } from 'react';
import { X, Save, Volume2, Plus, BrainCircuit } from 'lucide-react';

export interface CardDraft {
  front: string;
  back: string;
  extra_note?: string;
  card_type: 'reading' | 'listening';
  source_module: string;
  source_id?: string;
  media_url?: string; // Could be a local path or external URL
  video_clip?: { path: string, startMs: number, endMs: number }; // For video extraction
  tts_text?: string; // For Edge TTS generation
}

interface CardEditorProps {
  draft: CardDraft;
  onClose: () => void;
  onSaveSuccess?: () => void;
  editingCardId?: string;
}

export default function CardEditor({ draft, onClose, onSaveSuccess, editingCardId }: CardEditorProps) {
  const [front, setFront] = useState(draft.front);
  const [back, setBack] = useState(draft.back);
  const [extraNote, setExtraNote] = useState(draft.extra_note || '');
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(draft.media_url);
  const [generatingAudio, setGeneratingAudio] = useState(false);

  useEffect(() => {
    loadDecks();
    if (!mediaUrl && (draft.video_clip || draft.tts_text)) {
      generatePreviewAudio();
    }
  }, []);

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
        setSelectedDeck(res.decks[0].id);
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

      // 2. Save or Update Card
      if (window.api?.anki) {
        if (editingCardId) {
          const res = await window.api.anki.updateCard(editingCardId, {
             front,
             back,
             extra_note: extraNote,
             media_url: finalMediaUrl
          });
          if (!res.success) throw new Error(res.error);
        } else {
          const res = await window.api.anki.saveCard({
             deck_id: selectedDeck,
             front,
             back,
             extra_note: extraNote,
             source_module: draft.source_module,
             source_id: draft.source_id,
             media_url: finalMediaUrl,
             card_type: draft.card_type
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

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-dark-card border border-dark-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
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
          {!editingCardId && (
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
          )}

          <div>
             <div className="flex justify-between items-center mb-1">
               <label className="block text-sm font-medium text-dark-subtext">Frente</label>
               {draft.card_type === 'listening' && <Volume2 className="w-4 h-4 text-indigo-400" />}
             </div>
             <textarea 
               value={front}
               onChange={(e) => setFront(e.target.value)}
               className="w-full h-24 bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text resize-none focus:outline-none focus:border-indigo-500 text-lg leading-relaxed"
               placeholder="Texto principal ou frase..."
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-dark-subtext mb-1">Verso (Resposta)</label>
             <textarea 
               value={back}
               onChange={(e) => setBack(e.target.value)}
               className="w-full h-24 bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text resize-none focus:outline-none focus:border-indigo-500"
               placeholder="Tradução, significado, IPA..."
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

        <footer className="px-6 py-4 border-t border-dark-border bg-dark-bg/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-dark-subtext hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading || !selectedDeck || !front || !back}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Flashcard
          </button>
        </footer>

      </div>
    </div>
  );
}
