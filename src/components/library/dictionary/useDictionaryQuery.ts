import { useState, useCallback } from 'react';
import { promptGemini } from '../../../services/gemini';
import type { DictionaryData } from '../../../types/dictionary';

export function useDictionaryQuery(
  settings: any,
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

        // Mocking um banco de dados SQLite Local (Offline)
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
      "front": "${pageContext ? 'Junte as legendas do Contexto fornecido para formar APENAS UMA ÚNICA FRASE completa (lógica e coesa) que contém a palavra. Ignore trechos soltos ou fragmentos da próxima frase. Coloque a palavra em <b>negrito</b>. NÃO INVENTE OUTRA FRASE.' : 'Frase de contexto com a palavra-alvo em <b>negrito</b>. (Ex: She is a <b>brilliant</b> scientist.)'}",
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
      "front": "${pageContext ? 'Junte as legendas do Contexto fornecido para formar APENAS UMA ÚNICA FRASE completa (lógica e coesa) que contém a palavra. Ignore trechos soltos ou fragmentos da próxima frase. Coloque a palavra em <b>negrito</b>. NÃO INVENTE OUTRA FRASE.' : 'Frase de contexto com a palavra-alvo em <b>negrito</b>.'}",
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
  }, [settings, sourceType]);

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
