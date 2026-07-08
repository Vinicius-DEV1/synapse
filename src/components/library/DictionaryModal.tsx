import React, { useState, useEffect } from 'react';
import { X, BookType, Globe, Database, Sparkles, RefreshCw, BrainCircuit } from 'lucide-react';
import { getSettings } from '../../utils/settings';
import CardEditor from '../anki/CardEditor';

import type { DictionaryData, Collocation } from '../../types/dictionary';
import { useDictionaryQuery } from './dictionary/useDictionaryQuery';
import { DictionaryContent } from './dictionary/DictionaryContent';

export interface DictionaryModalProps {
  text: string;
  pageContext?: string;
  onClose: () => void;
  preloadedData?: DictionaryData | null;
  onSaveHighlight?: (color: string, note: string) => void;
  sourceType?: 'book' | 'video';
  videoClip?: { path: string; startMs: number; endMs: number };
}

export default function DictionaryModal({ text, pageContext, onClose, preloadedData, onSaveHighlight, sourceType = 'book', videoClip }: DictionaryModalProps) {
  const settings = getSettings();
  const [mode, setMode] = useState<'offline' | 'online'>(settings.dictionaryMode || (settings.hasOfflineDictionary ? 'offline' : 'online'));
  const [selectedColloc, setSelectedColloc] = useState<Collocation | null>(null);
  const [savedLocally, setSavedLocally] = useState(!!preloadedData);
  const [showAnkiEditor, setShowAnkiEditor] = useState(false);

  const {
    loading,
    result,
    dictionaryData,
    setDictionaryData,
    languageTab,
    setLanguageTab,
    error,
    fetchDefinition
  } = useDictionaryQuery(settings, sourceType);

  useEffect(() => {
    if (preloadedData) {
      setDictionaryData(preloadedData);
      setLanguageTab(preloadedData.detected_language === 'en' ? 'en' : 'pt');
    } else {
      fetchDefinition(text, pageContext, mode);
    }
  }, [text, mode, preloadedData, fetchDefinition, setDictionaryData, setLanguageTab, pageContext]);

  return (
    <div className="dictionary-modal-container select-none fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onMouseDown={onClose}>
      <div 
        className="bg-dark-card border border-white/10 rounded-2xl w-[600px] max-w-[95vw] max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-bg/50">
          <div className="flex items-center gap-2 text-brand-400">
            <BookType size={18} />
            <span className="font-semibold text-sm text-white">Dicionário</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Toggle Mode */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setMode('offline')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  mode === 'offline' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'
                }`}
              >
                <Database size={10} />
                Offline
              </button>
              <button
                onClick={() => setMode('online')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  mode === 'online' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'
                }`}
              >
                <Globe size={10} />
                Online
              </button>
            </div>

            <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Selected Word & Tabs */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-0.5">
            <p className="text-lg font-bold text-white">"{(dictionaryData?.analyzed_word) || text}"</p>
            {dictionaryData && (languageTab === 'en' ? dictionaryData.english : dictionaryData.portuguese)?.is_rare_or_complex && (
              <span className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-purple-500/20 to-brand-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                <Sparkles size={10} className="text-purple-400" />
                Advanced
              </span>
            )}
          </div>
          {dictionaryData && (
            <div className="flex items-center gap-2 mb-3">
              {(languageTab === 'en' ? dictionaryData.english : dictionaryData.portuguese) && (
                <div className="text-xs text-brand-300 opacity-80 font-medium">
                  {(languageTab === 'en' ? dictionaryData.english : dictionaryData.portuguese)?.phonetic} 
                  {(languageTab === 'en' ? dictionaryData.english : dictionaryData.portuguese)?.word_class && ` • ${(languageTab === 'en' ? dictionaryData.english : dictionaryData.portuguese)?.word_class}`}
                </div>
              )}
              {(languageTab === 'en' ? dictionaryData.english : dictionaryData.portuguese)?.nuance_tag && (
                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-medium border border-purple-500/20">
                  {(languageTab === 'en' ? dictionaryData.english : dictionaryData.portuguese)?.nuance_tag}
                </span>
              )}
            </div>
          )}
          
          {dictionaryData && dictionaryData.detected_language === 'en' && dictionaryData.portuguese && (
            <div className="flex items-center gap-4 mt-3">
              <button 
                onClick={() => setLanguageTab('en')}
                className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${languageTab === 'en' ? 'border-brand-500 text-brand-500' : 'border-transparent text-dark-subtext hover:text-white'}`}
              >
                🇺🇸 English
              </button>
              <button 
                onClick={() => setLanguageTab('pt')}
                className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${languageTab === 'pt' ? 'border-brand-500 text-brand-500' : 'border-transparent text-dark-subtext hover:text-white'}`}
              >
                🇧🇷 Português
              </button>
            </div>
          )}
          {dictionaryData && dictionaryData.detected_language === 'en' && !dictionaryData.portuguese && (
            <div className="flex items-center gap-4 mt-3">
              <button 
                className={`text-xs font-semibold pb-1 border-b-2 border-brand-500 text-brand-500`}
              >
                🇺🇸 English (Immersion)
              </button>
            </div>
          )}
          {dictionaryData && dictionaryData.detected_language === 'pt' && (
            <div className="flex items-center gap-4 mt-3">
              <button 
                className={`text-xs font-semibold pb-1 border-b-2 border-brand-500 text-brand-500`}
              >
                🇧🇷 Português
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-dark-subtext">
              <RefreshCw size={24} className="animate-spin mb-3 text-brand-400" />
              <p className="text-xs">
                {mode === 'online' ? 'Consultando IA...' : 'Buscando no banco local...'}
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-red-400 leading-relaxed mb-3">{error}</p>
              {mode === 'offline' && (
                <button 
                  onClick={() => setMode('online')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors"
                >
                  Tentar Modo Online (IA)
                </button>
              )}
            </div>
          ) : dictionaryData ? (
            <DictionaryContent 
              dictionaryData={dictionaryData}
              languageTab={languageTab}
              setSelectedColloc={setSelectedColloc}
            />
          ) : result ? (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-brand-400 prose-headings:text-sm prose-headings:font-semibold prose-headings:mb-2 prose-p:text-dark-text/90 prose-p:leading-relaxed">
              <div dangerouslySetInnerHTML={{ 
                __html: result
                  .replace(/### (.*)/g, '<h5>$1</h5>')
                  .replace(/## (.*)/g, '<h4>$1</h4>')
                  .replace(/# (.*)/g, '<h3>$1</h3>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/\n/g, '<br/>')
              }} />
            </div>
          ) : null}
        </div>
        
        <div className="px-4 py-2 bg-dark-bg/80 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-1.5">
            {mode === 'online' && !preloadedData && (
              <>
                <Sparkles size={12} className="text-brand-400" />
                <span className="text-[10px] text-dark-subtext">Gerado por IA (Gemini)</span>
              </>
            )}
            {preloadedData && (
              <>
                <Database size={12} className="text-blue-400" />
                <span className="text-[10px] text-dark-subtext">Salvo Localmente</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSaveHighlight && dictionaryData && !savedLocally && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const noteContent = `<!-- AI_DICT -->${JSON.stringify(dictionaryData)}`;
                  onSaveHighlight('yellow', noteContent);
                  setSavedLocally(true);
                }}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
              >
                <Database size={12} />
                <span>{sourceType === 'video' ? 'Salvar no Vídeo' : 'Salvar no Livro'}</span>
              </button>
            )}

            {savedLocally && onSaveHighlight && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-green-500/10 text-green-400">
                <Database size={12} />
                <span>{sourceType === 'video' ? 'Salvo no Vídeo' : 'Salvo Localmente'}</span>
              </div>
            )}

            {dictionaryData && (dictionaryData.english?.anki_card || dictionaryData.portuguese?.anki_card) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAnkiEditor(true);
                }}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              >
                <BrainCircuit size={12} />
                <span>Salvar no Anki</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showAnkiEditor && dictionaryData && (
        <CardEditor 
          draft={{
            front: dictionaryData.detected_language === 'en' 
              ? dictionaryData.english?.anki_card?.front || ''
              : dictionaryData.portuguese?.anki_card?.front || '',
            back: dictionaryData.detected_language === 'en'
              ? dictionaryData.english?.anki_card?.back || ''
              : dictionaryData.portuguese?.anki_card?.back || '',
            card_type: sourceType === 'video' ? 'listening' : 'reading',
            source_module: sourceType === 'video' ? 'video' : 'library',
            source_id: 'auto',
            tts_text: sourceType !== 'video' ? (
              dictionaryData.detected_language === 'en'
                ? dictionaryData.english?.anki_card?.front?.replace(/<[^>]*>?/gm, '') || text
                : dictionaryData.portuguese?.anki_card?.front?.replace(/<[^>]*>?/gm, '') || text
            ) : undefined,
            video_clip: (sourceType === 'video' && dictionaryData.detected_language === 'en' && dictionaryData.english?.anki_card?.video_clip) 
              ? { path: videoClip!.path, startMs: dictionaryData.english.anki_card.video_clip.startMs, endMs: dictionaryData.english.anki_card.video_clip.endMs }
              : (sourceType === 'video' && dictionaryData.detected_language === 'pt' && dictionaryData.portuguese?.anki_card?.video_clip)
                ? { path: videoClip!.path, startMs: dictionaryData.portuguese.anki_card.video_clip.startMs, endMs: dictionaryData.portuguese.anki_card.video_clip.endMs }
                : videoClip
          }}
          onClose={() => setShowAnkiEditor(false)}
        />
      )}

      {/* Sub-modal para Collocation */}
      {selectedColloc && (
        <div 
          className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" 
          onMouseDown={(e) => { e.stopPropagation(); setSelectedColloc(null); }}
        >
          <div 
            className="bg-dark-card border border-white/10 rounded-2xl w-80 shadow-2xl p-6 relative animate-scale-in max-h-[80vh] overflow-y-auto" 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedColloc(null); }} 
              className="absolute top-4 right-4 text-dark-subtext hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-1.5 text-blue-400 mb-4">
              <Sparkles size={14} />
              <h4 className="font-semibold text-xs uppercase tracking-wider">Common Pairing</h4>
            </div>
            <p className="text-xl font-bold text-white mb-2">{selectedColloc.expression}</p>
            <p className="text-sm text-brand-300 font-medium mb-4">{selectedColloc.meaning}</p>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <ul className="list-disc pl-4 space-y-2 marker:text-brand-500/50">
                {selectedColloc.examples.map((ex, i) => (
                  <li key={i} className="text-sm italic text-dark-text/90 leading-relaxed">"{ex}"</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
