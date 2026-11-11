import { useState, useCallback } from 'react';
import { promptGemini } from '../../../services/gemini';
import type { DictionaryData } from '../../../types/dictionary';
import type { AppSettings } from '../../../utils/settings';

export function useDictionaryQuery(
  settings: Partial<AppSettings>,
  sourceType: 'book' | 'video' = 'book'
) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dictionaryData, setDictionaryData] = useState<DictionaryData | null>(null);
  const [languageTab, setLanguageTab] = useState<'en' | 'pt'>('en');
  const [error, setError] = useState<string | null>(null);

  const fetchDefinition = useCallback(async (text: string, pageContext: string | undefined, mode: 'offline' | 'online') => {
    setLoading(true);
    setResult(null);
    setDictionaryData(null);
    setError(null);

    try {
      if (mode === 'offline') {
        if (!settings.hasOfflineDictionary) {
          setTimeout(() => {
            setError('Banco de dados offline não encontrado. Para usar o modo offline, baixe o pacote de idioma nas Configurações.');
            setLoading(false);
          }, 800);
          return;
        }

        // Offline local dictionary lookup simulation
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
0. MÁXIMA IMPORTÂNCIA: Se a palavra clicada fizer parte de um phrasal verb, expressão idiomática ou palavra composta presente no contexto (ex: o usuário selecionou 'up' e no contexto a frase era 'give up', ou 'fork' em 'breakfast fork'), você DEVE analisar a EXPRESSÃO COMPLETA e retornar todo o JSON sobre essa expressão, não apenas a palavra isolada.
1. Lexicografia: Retorne as definições separadas e numeradas (1. ..., 2. ...) baseadas em dicionários oficiais (Oxford/Cambridge/Michaelis). NUNCA resuma em um único texto se houver mais de um significado.
2. Pedagogia: Na explicação de contexto, explique por que a palavra foi usada neste contexto, e sugira collocations (combinações comuns de palavras nativas).
3. SEPARAÇÃO RIGOROSA DE IDIOMAS (REGRA ABSOLUTA):
   - No nó "english": ABSOLUTAMENTE TODOS OS TEXTOS E EXPLICAÇÕES (definitions, synonyms, collocations, context_explanation, etymology, nuance_explanation, contextual_synonyms, progressive_examples) DEVEM SER ESCRITOS 100% EM INGLÊS.
     * ATENÇÃO CRÍTICA: "english.context_explanation" DEVE SER REDIGIDO INTEGRALMENTE EM INGLÊS NATURAL (NUNCA EM PORTUGUÊS). Explique a cena, o enredo e o uso da palavra em inglês.
   - No nó "portuguese": Todos os textos (translation, definitions, synonyms, collocations, context_explanation, etymology, nuance_explanation) DEVEM SER ESCRITOS EM PORTUGUÊS. O campo "portuguese.context_explanation" DEVE ser a explicação da cena em português.
${isEnglishOnly ? '4. IMERSÃO TOTAL: Retorne TODAS as explicações exclusivamente em inglês. NUNCA retorne o nó "portuguese".' : ''}

Se a palavra for em INGLÊS:
Retorne estritamente um objeto JSON com a seguinte estrutura:
{
  "analyzed_word": "a palavra ou expressão que você efetivamente analisou (ex: 'give up' ou 'breakfast fork')",
  "detected_language": "en",
  "english": {
    "is_rare_or_complex": true/false (true if C1/C2, archaic, highly formal, or rare),
    "nuance_tag": "short tag like [Poetic] or [Formal] if rare, otherwise null",
    "word_class": "adjective/noun/verb/etc (in English)",
    "phonetic": "exact IPA phonetic transcription",
    "definitions": ["1. First strict English definition.", "2. Second strict English definition (if applicable)."],
    "synonyms": ["synonym 1 in English", "synonym 2 in English", "synonym 3 in English", "synonym 4 in English", "synonym 5 in English"],
    "collocations": [
      {"expression": "collocation or idiom", "meaning": "explanation of the meaning in English", "examples": ["example 1 in English", "example 2 in English"]}
    ],
    "context_explanation": "CRITICAL: MUST BE 100% IN NATURAL ENGLISH (NO PORTUGUESE). Do NOT give a grammar lesson. Explain in English what is happening in the scene/story based on the provided context. You MUST explicitly mention the analyzed word/expression and explain why it was used in this specific situation and how it contributes to the plot/character's action.",
    "examples": ["Example 1 in English", "Example 2 in English", "Example 3 in English", "Example 4 in English", "Example 5 in English"],
    "deep_dive": {
      "etymology": "historical roots of the word in English",
      "nuance_explanation": "details in English about the exact tone, connotation and when NOT to use it",
      "contextual_synonyms": [
        {"word": "synonym 1 in English", "nuance": "when to use this vs the original word"}
      ],
      "progressive_examples": ["1. basic everyday", "2. basic everyday", "3. intermediate", "4. intermediate", "5. intermediate", "6. advanced/literary", "7. advanced/literary", "8. advanced/literary"]
    },
    "anki_card": {
      "front": "${pageContext ? 'Junte as legendas do Contexto fornecido para formar APENAS UMA ÚNICA FRASE completa (lógica e coesa) que contém a palavra. Ignore trechos soltos ou fragmentos da próxima frase. Coloque a palavra em <b>negrito</b>. NÃO INVENTE OUTRA FRASE.' : 'Context sentence with the target word in <b>bold</b>. (Ex: She is a <b>brilliant</b> scientist.)'}",
      "back": "English definition / meaning + IPA phonetic transcription",
      ${sourceType === 'video' ? '"video_clip": { "startMs": 10500, "endMs": 16000 } // REQUIRED: Identify the first and last subtitle making up the full sentence and return exact start/end times.' : ''}
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
    "context_explanation": "NÃO dê aula de gramática. Explique o que está acontecendo na cena/história com base no contexto. Você DEVE citar explicitamente a palavra/expressão analisada e explicar por que ela foi usada nessa situação específica e como ela contribui para a ação ou sentimento do personagem.",
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
  "analyzed_word": "a palavra ou expressão que você efetivamente analisou",
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
      "front": "${pageContext ? 'Junte as legendas do Contexto fornecido para formar APENAS UMA ÚNICA FRASE completa (lógica e coesa) que contém a palavra. Ignore trechos soltos ou fragmentos da próxima frase. Coloque a palavra em <b>negrito</b>. NÃO INVENTE OUTRA FRASE.' : 'Frase de contexto com a palavra-alvo em <b>negrito</b>.'}",
      "back": "Significado preciso em português.",
      ${sourceType === 'video' ? '"video_clip": { "startMs": 10500, "endMs": 16000 } // REQUIRED: Identify the first and last subtitle making up the full sentence and return exact start/end times.' : ''}
    }
  }
}

Retorne APENAS o JSON válido, sem formatação markdown (sem \`\`\`json) e sem nenhum texto adicional.`;

        const response = await promptGemini(
          prompt,
          undefined,
          [],
          settings.geminiModelDictionary || settings.geminiModel
        );
        
        try {
          const cleaned = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned) as DictionaryData;
          setDictionaryData(parsed);
          setLanguageTab(parsed.detected_language === 'en' ? 'en' : 'pt');
        } catch {
          // Fallback if AI fails to return valid JSON
          setResult(response.text);
        }
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar definição.';
      setError(msg);
      setLoading(false);
    }
  }, [settings.hasOfflineDictionary, settings.aiDictionaryLanguage, settings.geminiModelDictionary, settings.geminiModel, sourceType]);

  return {
    loading,
    result,
    dictionaryData,
    setDictionaryData,
    languageTab,
    setLanguageTab,
    error,
    setError,
    fetchDefinition
  };
}
