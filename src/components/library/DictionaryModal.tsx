import React, { useState, useEffect } from 'react';
import { X, BookType, Globe, Database, Sparkles, RefreshCw, BrainCircuit } from 'lucide-react';
import { getSettings } from '../../utils/settings';
import { promptGemini } from '../../services/gemini';
import CardEditor from '../anki/CardEditor';

export interface Collocation {
  expression: string;
  meaning: string;
  examples: string[];
}

export interface DeepDiveSynonym {
  word: string;
  nuance: string;
}

export interface DeepDive {
  etymology: string;
  nuance_explanation: string;
  contextual_synonyms: DeepDiveSynonym[];
  progressive_examples: string[];
}

export interface AnkiCard {
  front: string;
  back: string;
  video_clip?: {
    startMs: number;
    endMs: number;
  };
}

interface LanguageData {
  word_class?: string;
  phonetic?: string;
  definitions: string[];
  synonyms?: string[];
  collocations?: Collocation[];
  context_explanation?: string;
  examples: string[];
  is_rare_or_complex?: boolean;
  nuance_tag?: string;
  deep_dive?: DeepDive;
  anki_card?: AnkiCard;
}

interface DictionaryData {
  detected_language: 'en' | 'pt';
  english?: LanguageData;
  portuguese: LanguageData & { translation: string };
}

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dictionaryData, setDictionaryData] = useState<DictionaryData | null>(null);
  const [languageTab, setLanguageTab] = useState<'en' | 'pt'>('en');
  const [error, setError] = useState<string | null>(null);
  const [selectedColloc, setSelectedColloc] = useState<Collocation | null>(null);
  const [savedLocally, setSavedLocally] = useState(!!preloadedData);
  const [showAnkiEditor, setShowAnkiEditor] = useState(false);

  useEffect(() => {
    if (preloadedData) {
      setDictionaryData(preloadedData);
      setLanguageTab(preloadedData.detected_language === 'en' ? 'en' : 'pt');
    } else {
      fetchDefinition(mode);
    }
  }, [text, mode, preloadedData]);

  const fetchDefinition = async (currentMode: 'offline' | 'online') => {
    setLoading(true);
    setResult(null);
    setDictionaryData(null);
    setError(null);

    try {
      if (currentMode === 'offline') {
        if (!settings.hasOfflineDictionary) {
          setTimeout(() => {
            setError('Banco de dados offline não encontrado. Para usar o modo offline, baixe o pacote de idioma nas Configurações.');
            setLoading(false);
          }, 800);
          return;
        }

        // Mocking um banco de dados SQLite Local (Offline)
        // Para a demonstração, retornaremos uma definição genérica ou identificada simulando o DB
        setTimeout(() => {
          const cleanWord = text.trim();
          let markdown = `### ${cleanWord}\n\n`;
          markdown += `*sf/sm* (Modo Offline)\n\n`;
          markdown += `**Definição Local**\n`;
          markdown += `1. Definição simulada para a palavra "${cleanWord}" extraída do banco de dados local.\n`;
          markdown += `> Exemplo: O sistema encontrou "${cleanWord}" no dicionário offline sem usar internet.\n\n`;
          
          setResult(markdown);
          setLoading(false);
        }, 600);
      } else {
        const isEnglishOnly = settings.aiDictionaryLanguage === 'english_only';
        
        const prompt = `Você é um dicionário internacional renomado e um professor de idiomas experiente focado em estudantes brasileiros.
Analise a palavra ou trecho selecionado: "${text}".
${pageContext ? `Contexto da página: "${pageContext}"\n` : ''}

Identifique o idioma da palavra. Siga ESTAS REGRAS RÍGIDAS:
1. Lexicografia: Retorne as definições separadas e numeradas (1. ..., 2. ...) baseadas em dicionários oficiais (Oxford/Cambridge/Michaelis). NUNCA resuma em um único texto se houver mais de um significado.
2. Pedagogia: Na explicação de contexto, explique por que a palavra foi usada neste contexto, e sugira collocations (combinações comuns de palavras nativas).
${isEnglishOnly ? '3. IMERSÃO TOTAL: Retorne TODAS as explicações exclusivamente em inglês. NUNCA traduza para o português.' : ''}

Se a palavra for em INGLÊS:
Retorne estritamente um objeto JSON com a seguinte estrutura:
{
  "detected_language": "en",
  "english": {
    "is_rare_or_complex": true/false (true if C1/C2, archaic, highly formal, or rare),
    "nuance_tag": "short tag like [Poetic] or [Formal] if rare, otherwise null",
    "word_class": "adjective/noun/verb/etc (em inglês)",
    "phonetic": "transcrição fonética IPA exata",
    "definitions": ["1. Primeiro significado estrito.", "2. Segundo significado estrito (se aplicável)."],
    "synonyms": ["sinônimo 1", "sinônimo 2", "sinônimo 3", "sinônimo 4", "sinônimo 5"],
    "collocations": [
      {"expression": "collocation or idiom", "meaning": "explanation of the meaning in English", "examples": ["example 1", "example 2", "example 3", "example 4", "example 5"]}
    ],
    "context_explanation": "Extensive didactic explanation in ENGLISH about the usage of the word in this specific context.",
    "examples": ["Example 1 in English", "Example 2 in English", "Example 3 in English", "Example 4 in English", "Example 5 in English"],
    "deep_dive": {
      "etymology": "historical roots of the word",
      "nuance_explanation": "details about the exact tone, connotation and when NOT to use it",
      "contextual_synonyms": [
        {"word": "synonym 1", "nuance": "when to use this vs the original word"},
        {"word": "synonym 2", "nuance": "when to use this vs the original word"},
        {"word": "synonym 3", "nuance": "when to use this vs the original word"},
        {"word": "synonym 4", "nuance": "when to use this vs the original word"},
        {"word": "synonym 5", "nuance": "when to use this vs the original word"}
      ],
      "progressive_examples": ["1. basic everyday", "2. basic everyday", "3. intermediate", "4. intermediate", "5. intermediate", "6. advanced/literary", "7. advanced/literary", "8. advanced/literary"]
    },
    "anki_card": {
      "front": "${pageContext ? 'Junte as legendas do Contexto fornecido para formar a FRASE COMPLETA (lógica e gramatical) que contém a palavra. Coloque a palavra em <b>negrito</b>. NÃO INVENTE OUTRA FRASE.' : 'Frase de contexto com a palavra-alvo em <b>negrito</b>. (Ex: She is a <b>brilliant</b> scientist.)'}",
      "back": "Tradução/Significado em inglês (se EnglishOnly) ou português + transcrição fonética IPA (Ex: meaning... /brɪliənt/)",
      ${sourceType === 'video' ? '"video_clip": { "startMs": 10500, "endMs": 16000 } // OBRIGATÓRIO: Identifique a primeira e a última legenda que compõem a frase completa e retorne o tempo mínimo e máximo exatos.' : ''}
    }
  }${isEnglishOnly ? '' : `,
  "portuguese": {
    "translation": "Tradução direta e precisa para o português.",
    "is_rare_or_complex": true/false,
    "nuance_tag": "short tag if rare, otherwise null",
    "definitions": ["1. Primeiro significado em português.", "2. Segundo significado em português."],
    "synonyms": ["sinônimo 1", "sinônimo 2", "sinônimo 3", "sinônimo 4", "sinônimo 5"],
    "collocations": [
      {"expression": "combinação 1", "meaning": "significado da combinação", "examples": ["exemplo 1", "exemplo 2", "exemplo 3", "exemplo 4", "exemplo 5"]}
    ],
    "context_explanation": "Extensa explicação didática em PORTUGUÊS detalhando o uso da palavra neste contexto.",
    "examples": ["Exemplo 1 original em inglês", "Exemplo 2 original em inglês", "Exemplo 3 original em inglês", "Exemplo 4 original em inglês", "Exemplo 5 original em inglês"],
    "deep_dive": {
      "etymology": "origem e raízes históricas",
      "nuance_explanation": "nuances e tom emocional da palavra",
      "contextual_synonyms": [
        {"word": "sinônimo 1", "nuance": "quando usar"}
      ],
      "progressive_examples": ["1. básico", "2. básico", "3. intermediário", "4. intermediário", "5. intermediário", "6. avançado", "7. avançado", "8. avançado"]
    }
  }`}
}

Se a palavra for em PORTUGUÊS:
Retorne estritamente um objeto JSON com a seguinte estrutura:
{
  "detected_language": "pt",
  "portuguese": {
    "translation": "A própria palavra.",
    "is_rare_or_complex": true/false,
    "nuance_tag": "short tag se rara",
    "definitions": ["1. Primeiro significado.", "2. Segundo significado."],
    "synonyms": ["sinônimo 1", "sinônimo 2", "sinônimo 3", "sinônimo 4", "sinônimo 5"],
    "collocations": [
      {"expression": "expressão comum 1", "meaning": "significado da expressão", "examples": ["exemplo 1", "exemplo 2", "exemplo 3", "exemplo 4", "exemplo 5"]}
    ],
    "context_explanation": "Explicação do significado da palavra no contexto (se houver).",
    "examples": ["Exemplo 1 em português", "Exemplo 2 em português", "Exemplo 3 em português", "Exemplo 4 em português", "Exemplo 5 em português"],
    "deep_dive": {
      "etymology": "origem e raízes",
      "nuance_explanation": "nuance da palavra",
      "contextual_synonyms": [
        {"word": "sinônimo 1", "nuance": "quando usar"}
      ],
      "progressive_examples": ["1. básico", "2. básico", "3. intermediário", "4. intermediário", "5. intermediário", "6. avançado", "7. avançado", "8. avançado"]
    },
    "anki_card": {
      "front": "${pageContext ? 'Junte as legendas do Contexto fornecido para formar a FRASE COMPLETA (lógica e gramatical) que contém a palavra. Coloque a palavra em <b>negrito</b>. NÃO INVENTE OUTRA FRASE.' : 'Frase de contexto com a palavra-alvo em <b>negrito</b>.'}",
      "back": "Significado preciso em português.",
      ${sourceType === 'video' ? '"video_clip": { "startMs": 10500, "endMs": 16000 } // OBRIGATÓRIO: Identifique a primeira e a última legenda que compõem a frase completa e retorne o tempo mínimo e máximo exatos.' : ''}
    }
  }
}

Retorne APENAS o JSON válido, sem formatação markdown (sem \`\`\`json) e sem nenhum texto adicional.`;

        const response = await promptGemini(
          prompt,
          undefined,
          []
        );
        
        try {
          const cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned) as DictionaryData;
          setDictionaryData(parsed);
          setLanguageTab(parsed.detected_language === 'en' ? 'en' : 'pt');
        } catch (e) {
          // Fallback if AI fails to return valid JSON
          setResult(response);
        }
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar definição.');
      setLoading(false);
    }
  };

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
            <p className="text-lg font-bold text-white">"{text}"</p>
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
            <div className="flex flex-col gap-6 text-sm text-dark-text/90">
              {languageTab === 'en' && dictionaryData.english ? (
                <>
                  <div>
                    <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Definition</h4>
                    <div className="flex flex-col gap-1.5">
                      {dictionaryData.english.definitions.map((def, i) => (
                        <p key={i} className="leading-relaxed text-[15px] text-white/90">{def}</p>
                      ))}
                    </div>
                  </div>

                  {dictionaryData.english.is_rare_or_complex && dictionaryData.english.deep_dive && (
                    <>
                      <div>
                        <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Etymology & Roots</h4>
                        <p className="leading-relaxed text-sm text-white/90">{dictionaryData.english.deep_dive.etymology}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Nuance & Connotation</h4>
                        <p className="text-sm text-white/90 leading-relaxed bg-brand-500/10 p-3 rounded-lg border border-brand-500/20">{dictionaryData.english.deep_dive.nuance_explanation}</p>
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
                            <span className="text-xs text-dark-subtext italic">{syn.nuance}</span>
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
                      <p className="leading-relaxed text-sm">{dictionaryData.english.context_explanation}</p>
                    </div>
                  )}

                  {dictionaryData.english.is_rare_or_complex && dictionaryData.english.deep_dive ? (
                    <div>
                      <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Progressive Examples</h4>
                      <ul className="space-y-3">
                        {dictionaryData.english.deep_dive.progressive_examples.map((ex, i) => (
                          <li key={i} className="text-sm italic text-white/80 border-l-2 border-brand-500/50 pl-3">"{ex}"</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Examples</h4>
                      <ul className="list-disc pl-4 space-y-1.5 opacity-90 italic">
                        {dictionaryData.english.examples.map((ex, i) => (
                          <li key={i}>{ex}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {dictionaryData.detected_language === 'en' && (
                    <div>
                      <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Tradução</h4>
                      <p className="leading-relaxed font-semibold text-[15px] text-white/90">{dictionaryData.portuguese.translation}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Significado</h4>
                    <div className="flex flex-col gap-1.5">
                      {dictionaryData.portuguese.definitions.map((def, i) => (
                        <p key={i} className="leading-relaxed text-[15px] text-white/90">{def}</p>
                      ))}
                    </div>
                  </div>

                  {dictionaryData.portuguese.is_rare_or_complex && dictionaryData.portuguese.deep_dive && (
                    <>
                      <div>
                        <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Etimologia e Raízes</h4>
                        <p className="leading-relaxed text-sm text-white/90">{dictionaryData.portuguese.deep_dive.etymology}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-purple-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Nuances</h4>
                        <p className="text-sm text-white/90 leading-relaxed bg-brand-500/10 p-3 rounded-lg border border-brand-500/20">{dictionaryData.portuguese.deep_dive.nuance_explanation}</p>
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
                            <span className="text-xs text-dark-subtext italic">{syn.nuance}</span>
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
                      <p className="leading-relaxed text-sm">{dictionaryData.portuguese.context_explanation}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-brand-400 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">Exemplos</h4>
                    <ul className="list-disc pl-4 space-y-1.5 opacity-90 italic">
                      {dictionaryData.portuguese.examples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
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

          {dictionaryData && (dictionaryData.english?.anki_card || dictionaryData.portuguese?.anki_card) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAnkiEditor(true);
              }}
              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors ml-2"
            >
              <BrainCircuit size={12} />
              <span>Salvar no Anki</span>
            </button>
          )}

          {savedLocally && onSaveHighlight && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-green-500/10 text-green-400 ml-2">
              <Database size={12} />
              <span>{sourceType === 'video' ? 'Salvo no Vídeo' : 'Salvo Localmente'}</span>
            </div>
          )}
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
