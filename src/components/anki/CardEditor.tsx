import { X, Save, Volume2, BrainCircuit, Sparkles } from 'lucide-react';
import { Portal } from '../ui/Portal';
import AIAssistantModal from './AIAssistantModal';
import { TagInput } from './editor/TagInput';
import { AudioPreview } from './editor/AudioPreview';
import { useCardEditorForm } from './hooks/useCardEditorForm';
import type { CardDraft } from './types';

export type { CardDraft };

interface CardEditorProps {
  draft: CardDraft;
  onClose: () => void;
  onSaveSuccess?: () => void;
  editingCardId?: string;
  parentDeckId?: string; // Pre-select this deck when creating new card
}

export default function CardEditor({ draft, onClose, onSaveSuccess, editingCardId, parentDeckId }: CardEditorProps) {
  const {
    front,
    setFront,
    back,
    setBack,
    extraNote,
    setExtraNote,
    decks,
    selectedDeck,
    setSelectedDeck,
    loading,
    mediaUrl,
    generatingAudio,
    cardType,
    setCardType,
    validationMode,
    setValidationMode,
    showAIAssistant,
    setShowAIAssistant,
    tags,
    setTags,
    frontRef,
    backRef,
    handleSave,
    handleAddCardsFromAI,
  } = useCardEditorForm({
    draft,
    editingCardId,
    parentDeckId,
    onSaveSuccess,
    onClose,
  });

  return (
    <Portal>
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
                  <option className="bg-dark-bg text-white" key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-dark-subtext mb-1">Tipo de Cartão</label>
                <select 
                  value={cardType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setCardType(val);
                    if (val === 'speaking') {
                      setValidationMode('ai');
                    }
                  }}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-indigo-500 appearance-none"
                >
                  <option className="bg-dark-bg text-white" value="reading">Leitura (Padrão)</option>
                  <option className="bg-dark-bg text-white" value="listening">Escuta (Áudio)</option>
                  <option className="bg-dark-bg text-white" value="typing">Digitação Livre</option>
                  <option className="bg-dark-bg text-white" value="speaking">Fala Livre (Microfone)</option>
                  <option className="bg-dark-bg text-white" value="cloze">Completar Frase (Cloze)</option>
                </select>
              </div>
            </div>
            
            {(cardType === 'typing' || cardType === 'cloze' || cardType === 'speaking') && (
              <div className={`mb-4 border p-4 rounded-xl flex items-center justify-between ${cardType === 'speaking' ? 'bg-indigo-500/5 border-indigo-500/10 opacity-70' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                <div>
                  <p className="text-sm font-medium text-indigo-300">Validar com Inteligência Artificial</p>
                  <p className="text-xs text-indigo-400/70 mt-1">
                    {cardType === 'speaking' ? 'Obrigatório para Fala Livre (a IA vai avaliar seu áudio diretamente).' : 'A IA do Gemini irá julgar se a resposta tem o sentido correto, tolerando pequenos erros.'}
                  </p>
                </div>
                <label className={`relative inline-flex items-center ${cardType === 'speaking' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={validationMode === 'ai' || cardType === 'speaking'}
                    onChange={(e) => setValidationMode(e.target.checked ? 'ai' : 'exact')}
                    disabled={cardType === 'speaking'}
                  />
                  <div className={`w-11 h-6 border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${cardType === 'speaking' ? 'bg-indigo-600/50 border-white/5' : 'bg-dark-bg border-white/10 peer-checked:bg-indigo-600'}`}></div>
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
                 placeholder="Contexto adicional, etc."
               />
            </div>

            <TagInput tags={tags} setTags={setTags} />
            
            <AudioPreview draft={draft as any} mediaUrl={mediaUrl} generatingAudio={generatingAudio} />
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
    </Portal>
  );
}

