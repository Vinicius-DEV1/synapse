import { Sparkles } from 'lucide-react';
import type { DictionaryData, Collocation } from '../../../types/dictionary';
import { InteractiveDictText } from './InteractiveDictText';

interface DictionaryContentProps {
  dictionaryData: DictionaryData;
  languageTab: 'en' | 'pt';
  setSelectedColloc: (colloc: Collocation) => void;
  onWordClick?: (word: string) => void;
}

export function DictionaryContent({ dictionaryData, languageTab, setSelectedColloc, onWordClick }: DictionaryContentProps) {
  return (
    <div className="flex flex-col gap-6 text-sm text-dark-text/90">
      {languageTab === 'en' && dictionaryData.english ? (
        <>
          <div>
            <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Definition</h4>
            <div className="flex flex-col gap-1.5">
              {dictionaryData.english.definitions.map((def, i) => (
                <p key={i} className="leading-relaxed text-[15px] text-white/90">
                  <InteractiveDictText text={def} onWordClick={onWordClick} />
                </p>
              ))}
            </div>
          </div>

          {dictionaryData.english.is_rare_or_complex && dictionaryData.english.deep_dive && (
            <>
              <div>
                <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Etymology & Roots</h4>
                <p className="leading-relaxed text-sm text-white/90">
                  <InteractiveDictText text={dictionaryData.english.deep_dive.etymology} onWordClick={onWordClick} />
                </p>
              </div>
              
              <div>
                <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Nuance & Connotation</h4>
                <p className="text-sm text-white/90 leading-relaxed bg-brand-500/10 p-3 rounded-lg border border-brand-500/20">
                  <InteractiveDictText text={dictionaryData.english.deep_dive.nuance_explanation} onWordClick={onWordClick} />
                </p>
              </div>
            </>
          )}
          
          {dictionaryData.english.is_rare_or_complex && dictionaryData.english.deep_dive ? (
            <div>
              <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Contextual Synonyms</h4>
              <div className="space-y-2">
                {dictionaryData.english.deep_dive.contextual_synonyms.map((syn, i) => (
                  <div key={i} className="bg-white/5 p-2 rounded border border-white/5">
                    <span className="font-semibold text-brand-200 text-sm mr-2">{syn.word}</span>
                    <span className="text-xs text-dark-subtext italic">
                      <InteractiveDictText text={syn.nuance} onWordClick={onWordClick} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            dictionaryData.english.synonyms && dictionaryData.english.synonyms.length > 0 && (
              <div>
                <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Synonyms</h4>
                <div className="flex flex-wrap gap-1.5">
                  {dictionaryData.english.synonyms.map((syn, i) => (
                    <span key={i} className="px-2 py-1 bg-white/5 text-brand-100 rounded-md text-xs border border-white/10">{syn}</span>
                  ))}
                </div>
              </div>
            )
          )}

          {dictionaryData.english.collocations && dictionaryData.english.collocations.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-blue-400 mb-1.5">
                <Sparkles size={12} />
                <h4 className="font-semibold text-[11px] uppercase tracking-wider">Common Pairings</h4>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dictionaryData.english.collocations.map((colloc, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSelectedColloc(colloc)}
                    className="px-2 py-1 bg-blue-500/20 text-blue-200 hover:text-white rounded-md text-[13px] font-medium border border-blue-500/20 hover:bg-blue-500/40 transition-colors cursor-pointer"
                  >
                    {colloc.expression}
                  </button>
                ))}
              </div>
            </div>
          )}

          {dictionaryData.english.context_explanation && (
            <div className="bg-brand-500/5 border-l-2 border-brand-500 pl-3 py-1">
              <h4 className="text-brand-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">In Context</h4>
              <p className="leading-relaxed text-sm">
                <InteractiveDictText text={dictionaryData.english.context_explanation} onWordClick={onWordClick} />
              </p>
            </div>
          )}

          {dictionaryData.english.is_rare_or_complex && dictionaryData.english.deep_dive ? (
            <div>
              <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Progressive Examples</h4>
              <ul className="space-y-3">
                {dictionaryData.english.deep_dive.progressive_examples.map((ex, i) => (
                  <li key={i} className="text-sm italic text-white/80 border-l-2 border-brand-500/50 pl-3">
                    "<InteractiveDictText text={ex} onWordClick={onWordClick} />"
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Examples</h4>
              <ul className="list-disc pl-4 space-y-1.5 opacity-90 italic">
                {dictionaryData.english.examples.map((ex, i) => (
                  <li key={i}>
                    <InteractiveDictText text={ex} onWordClick={onWordClick} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          {dictionaryData.detected_language === 'en' && dictionaryData.portuguese && (
            <div>
              <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Tradução</h4>
              <p className="leading-relaxed font-semibold text-[15px] text-white/90">{dictionaryData.portuguese.translation}</p>
            </div>
          )}
          <div>
            <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Significado</h4>
            <div className="flex flex-col gap-1.5">
              {dictionaryData.portuguese.definitions.map((def, i) => (
                <p key={i} className="leading-relaxed text-[15px] text-white/90">
                  <InteractiveDictText text={def} onWordClick={onWordClick} />
                </p>
              ))}
            </div>
          </div>

          {dictionaryData.portuguese.is_rare_or_complex && dictionaryData.portuguese.deep_dive && (
            <>
              <div>
                <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Etimologia e Raízes</h4>
                <p className="leading-relaxed text-sm text-white/90">
                  <InteractiveDictText text={dictionaryData.portuguese.deep_dive.etymology} onWordClick={onWordClick} />
                </p>
              </div>
              
              <div>
                <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Nuances</h4>
                <p className="text-sm text-white/90 leading-relaxed bg-brand-500/10 p-3 rounded-lg border border-brand-500/20">
                  <InteractiveDictText text={dictionaryData.portuguese.deep_dive.nuance_explanation} onWordClick={onWordClick} />
                </p>
              </div>
            </>
          )}
          
          {dictionaryData.portuguese.is_rare_or_complex && dictionaryData.portuguese.deep_dive ? (
            <div>
              <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Sinônimos Contextuais</h4>
              <div className="space-y-2">
                {dictionaryData.portuguese.deep_dive.contextual_synonyms.map((syn, i) => (
                  <div key={i} className="bg-white/5 p-2 rounded border border-white/5">
                    <span className="font-semibold text-brand-200 text-sm mr-2">{syn.word}</span>
                    <span className="text-xs text-dark-subtext italic">
                      <InteractiveDictText text={syn.nuance} onWordClick={onWordClick} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            dictionaryData.portuguese.synonyms && dictionaryData.portuguese.synonyms.length > 0 && (
              <div>
                <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Sinônimos</h4>
                <div className="flex flex-wrap gap-1.5">
                  {dictionaryData.portuguese.synonyms.map((syn, i) => (
                    <span key={i} className="px-2 py-1 bg-white/5 text-brand-100 rounded-md text-xs border border-white/10">{syn}</span>
                  ))}
                </div>
              </div>
            )
          )}

          {dictionaryData.portuguese.collocations && dictionaryData.portuguese.collocations.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-blue-400 mb-1.5">
                <Sparkles size={12} />
                <h4 className="font-semibold text-[11px] uppercase tracking-wider">Expressões Comuns</h4>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dictionaryData.portuguese.collocations.map((colloc, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSelectedColloc(colloc)}
                    className="px-2 py-1 bg-blue-500/20 text-blue-200 hover:text-white rounded-md text-[13px] font-medium border border-blue-500/20 hover:bg-blue-500/40 transition-colors cursor-pointer"
                  >
                    {colloc.expression}
                  </button>
                ))}
              </div>
            </div>
          )}

          {dictionaryData.portuguese.context_explanation && (
            <div className="bg-brand-500/5 border-l-2 border-brand-500 pl-3 py-1">
              <h4 className="text-brand-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">No Contexto</h4>
              <p className="leading-relaxed text-sm">
                <InteractiveDictText text={dictionaryData.portuguese.context_explanation} onWordClick={onWordClick} />
              </p>
            </div>
          )}

          <div>
            <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Exemplos</h4>
            <ul className="list-disc pl-4 space-y-1.5 opacity-90 italic">
              {dictionaryData.portuguese.examples.map((ex, i) => (
                <li key={i}>
                  <InteractiveDictText text={ex} onWordClick={onWordClick} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
