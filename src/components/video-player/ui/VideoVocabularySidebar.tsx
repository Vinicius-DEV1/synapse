import React from 'react';
import { BookOpen, X, Trash2, Sparkles } from 'lucide-react';
import type { VideoItem, VideoWord } from '../../../types';
import type { DictionaryData } from '../../../types/dictionary';

interface VideoVocabularySidebarProps {
  video: VideoItem;
  videoWords: VideoWord[];
  setShowVocabDrawer: (val: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  loadVideoWords: () => void;
  setDictState: (state: { word: string; context: string; preloadedData?: DictionaryData | null } | null) => void;
}

export function VideoVocabularySidebar({
  videoWords, setShowVocabDrawer, videoRef, loadVideoWords, setDictState
}: VideoVocabularySidebarProps) {
  return (
    <div className="absolute inset-y-0 right-0 w-96 max-w-full bg-dark-card border-l border-white/10 shadow-2xl z-50 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-brand-400" />
          <h2 className="text-lg font-bold text-white">Vocabulário Salvo</h2>
        </div>
        <button 
          onClick={() => {
            setShowVocabDrawer(false);
            if (videoRef.current) videoRef.current.play();
          }}
          className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {videoWords.length === 0 ? (
          <div className="text-center text-white/50 py-10">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <p>Você ainda não salvou nenhuma palavra neste vídeo.</p>
            <p className="text-sm mt-2">Clique nas legendas para salvar!</p>
          </div>
        ) : (
          [...videoWords].sort((a, b) => a.timestamp - b.timestamp).map(vw => (
            <div key={vw.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: vw.color === 'yellow' ? '#facc15' : vw.color === 'green' ? '#4ade80' : vw.color === 'blue' ? '#60a5fa' : vw.color === 'purple' ? '#c084fc' : vw.color === 'pink' ? '#f472b6' : vw.color === 'red' ? '#f87171' : '#facc15' }} />
                  <h4 className="text-white font-bold">{vw.word}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = vw.timestamp;
                        setShowVocabDrawer(false);
                        videoRef.current.play();
                      }
                    }}
                    className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-white/70 hover:text-white hover:bg-brand-500 transition-colors"
                  >
                    {new Date(vw.timestamp * 1000).toISOString().substring(14, 19)}
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.api?.sync) {
                        await window.api.sync.upsertRow('video_words', { ...vw, deleted_at: new Date().toISOString() });
                        loadVideoWords();
                      }
                    }}
                    className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {vw.context && (
                <p className="text-sm text-white/60 italic border-l-2 border-white/20 pl-3 py-1 mt-2 line-clamp-3">
                  "{vw.context.match(/\\[Cena Atual\\]:\\s*([^\\n]+)/)?.[1] || vw.context}"
                </p>
              )}
              {vw.note && vw.note.startsWith('<!-- AI_DICT -->') ? (
                (() => {
                  try {
                    const data = JSON.parse(vw.note.replace('<!-- AI_DICT -->', ''));
                    let defs: string[] = [];
                    if (data.english?.definitions) defs = data.english.definitions;
                    else if (data.english?.definition) defs = [data.english.definition];
                    else if (data.definitions) defs = data.definitions;
                    else if (data.definition) defs = [data.definition];
                    
                    const textToShow = defs.length > 0 ? defs[0] : (data.portuguese?.definition || data.portuguese?.definitions?.[0] || 'Dicionário IA');
                    
                    return (
                      <button 
                        onClick={() => {
                          if (videoRef.current) videoRef.current.pause();
                          setDictState({ word: vw.word, context: vw.context, preloadedData: data });
                          setShowVocabDrawer(false);
                        }}
                        className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400 p-2 bg-white/50 dark:bg-black/20 rounded text-left hover:bg-black/40 transition-colors w-full group/btn cursor-pointer flex flex-col gap-1 border border-transparent hover:border-brand-500/30"
                      >
                        <div className="flex items-center justify-between opacity-70">
                          <div className="flex items-center gap-1">
                            <Sparkles size={10} /> <span className="font-bold text-[9px] uppercase tracking-wider">IA Salva</span>
                          </div>
                          <span className="text-[9px] opacity-0 group-hover/btn:opacity-100 transition-opacity">Ver Mais →</span>
                        </div>
                        <div className="line-clamp-2 opacity-90">{textToShow}</div>
                      </button>
                    );
                  } catch {
                    return <p className="text-sm text-brand-300 mt-1">{vw.note}</p>;
                  }
                })()
              ) : vw.note ? (
                <p className="text-sm text-brand-300 mt-1">{vw.note}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
