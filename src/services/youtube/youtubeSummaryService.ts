import { promptGemini } from '../gemini';
import type { YouTubeSummaryRecord, YouTubeTranscriptResult, YouTubeFrameResult } from '../../api/types';

/**
 * In-memory LRU-like cache for 0ms instantaneous retrieval during active app session.
 */
const memorySummaryCache = new Map<string, YouTubeSummaryRecord>();

/**
 * Normalizes YouTube video ID from multiple URL variants (watch?v=, youtu.be, embed, shorts).
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('?')[0] || null;
    }
    if (parsed.pathname.includes('/shorts/')) {
      return parsed.pathname.split('/shorts/')[1]?.split('?')[0] || null;
    }
    if (parsed.pathname.includes('/embed/')) {
      return parsed.pathname.split('/embed/')[1]?.split('?')[0] || null;
    }
    return parsed.searchParams.get('v');
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^&?#/]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Retrieves an already persisted video summary from cache or SQLite.
 */
export async function getExistingVideoSummary(videoId: string): Promise<YouTubeSummaryRecord | null> {
  if (!videoId) return null;

  // 1. Fast in-memory check (0ms perceived latency)
  if (memorySummaryCache.has(videoId)) {
    return memorySummaryCache.get(videoId) || null;
  }

  // 2. Persistent SQLite query via multiplatform adapter
  if (window.api?.youtube?.getSummary) {
    try {
      const record = await window.api.youtube.getSummary(videoId);
      if (record) {
        memorySummaryCache.set(videoId, record);
        return record;
      }
    } catch (err) {
      console.warn('[youtubeSummaryService] Failed to query local summary from DB:', err);
    }
  }

  return null;
}

/**
 * Fast check whether a video already has a persisted summary.
 */
export async function hasExistingVideoSummary(videoId: string): Promise<boolean> {
  const existing = await getExistingVideoSummary(videoId);
  return Boolean(existing?.summary);
}

/**
 * System instruction and prompt formatting tailored for educational clarity,
 * strict noise/promotional elimination, and prominent timestamp citation.
 */
export const YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION = `Você é um instrutor e pedagogo especialista do aplicativo Caderno. Sua missão é transformar transcrições de vídeos e aulas do YouTube em resumos didáticos, profundos, estruturados e impecáveis.

DIRETRIZES FUNDAMENTAIS:
1. FOCO TOTAL NO CONTEÚDO E APRENDIZADO:
   - Extraia e explique tudo o que foi ensinado e abordado no vídeo com riqueza de detalhes e clareza didática.
   - NUNCA omita partes importantes da explicação, raciocínios técnicos, fórmulas, códigos ou passos práticos.
2. FILTRO ESTRITO DE RUÍDO E PROPAGANDA:
   - Remova COMPLETAMENTE: pedidos de like, inscrições, vinhetas, saudações vazias, patrocinadores, menções a cursos pagos externos, produtos e conversas paralelas irrelevantes.
   - O resumo deve conter exclusivamente o CONTEÚDO ÚTIL e instrutivo do vídeo.
3. CITAÇÃO OBRIGATÓRIA DE MINUTAGENS / TIMESTAMPS:
   - O usuário precisa saber exatamente em qual momento do vídeo cada tópico, conceito e passo prático acontece.
   - Em CADA seção, tópico principal e etapa explicada, cite a minutagem correspondente no formato [mm:ss] ou [hh:mm:ss] com base nas marcações da transcrição.
4. ESTRUTURAÇÃO DIDÁTICA EM MARKDOWN:
   - Use títulos e subtítulos claros com emojis funcionais.
   - Utilize listas com marcadores, destaques conceituais em negrito e blocos de código se houver programação/comandos.
   - Siga esta ordem de tópicos:
     * ## 🎯 Visão Geral & Objetivo [00:00] (O que esta aula/vídeo ensina e por que é relevante)
     * ## 💡 Conceitos Fundamentais & Teoria [mm:ss] (Explicações claras da base teórica)
     * ## 🛠️ Passo a Passo & Conteúdo Detalhado (Cada etapa explicada em profundidade com seu [mm:ss])
     * ## ⭐ Dicas Práticas, Boas Práticas & Atenções [mm:ss] (Alertas, recomendações e cuidados citados)
     * ## 📌 Síntese Rápida & Fixação (Resumo consolidado dos pontos-chave para revisão rápida)
     * ## 🧠 Quiz de Fixação & Autoavaliação (Perguntas desafiadoras com gabarito explicativo)
5. DIAGRAMAS CONCEITUAIS MERMAID:
   - Sempre que o tema envolver processos, fluxos de decisão, arquiteturas, ciclos de vida, modelos conceituais ou hierarquias, inclua 1 a 2 diagramas em blocos \`\`\`mermaid (ex: graph TD, flowchart LR, sequenceDiagram, mindmap).
   - Use sintaxe estritamente correta no Mermaid, colocando sempre aspas em rótulos com caracteres especiais ou parênteses: ex. A["Início"] --> B["Processamento"].
6. 🧠 QUIZ DE FIXAÇÃO & AUTOAVALIAÇÃO INTERATIVO:
   - No final do resumo, crie SEMPRE a seção "## 🧠 Quiz de Fixação & Autoavaliação" com 3 a 5 perguntas desafiadoras para testar o aprendizado.
   - Formate cada questão usando a estrutura HTML <details> para permitir que o estudante tente responder antes de conferir a resposta:
     <details>
     <summary>❓ <b>Pergunta 1:</b> [Enunciado instigante]</summary>

     > **Gabarito & Explicação:**
     > [Explicação clara do porquê do conceito correto com base na aula]
     </details>`;

/**
 * Parses timestamp string (mm:ss or hh:mm:ss) into total seconds.
 */
export function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const clean = ts.trim().replace(/[^\d:]/g, '');
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Formats total seconds into standard mm:ss string.
 */
export function formatSecondsToTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const s = total % 60;
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Builds Pass 1 prompt asking Gemini to scout up to 20 key timestamps where visual frames
 * (code, IDE, slides, diagrams, or garbled audio) are needed.
 */
export function buildScoutPrompt(title: string, channel: string, transcript: string): string {
  return `Você é um instrutor de excelência do aplicativo Caderno.
Analise a transcrição abaixo deste vídeo do YouTube ("${title}" - ${channel}) para prepararmos um resumo didático enriquecido com visão computacional.

Sua tarefa nesta primeira etapa é identificar os momentos exatos (minutagens [mm:ss]) onde capturas de tela (prints em alta resolução da tela do vídeo) serão indispensáveis para enriquecer o resumo, tais como:
1. Onde o professor mostra códigos em IDE/terminal, comandos, fórmulas matemáticas, tabelas ou arquitetura de software na tela.
2. Onde o áudio da legenda parece truncado, com termos técnicos em inglês mal transcritos foneticamente ou jargões confusos.
3. Transições chave de slides e demonstrações visuais práticas.

Responda ESTRITAMENTE em formato JSON (sem preâmbulo, sem blocos de texto antes ou depois):
\`\`\`json
{
  "has_visual_content": true,
  "scout_notes": "Breve análise do tipo de conteúdo visual esperado",
  "timestamps": [
    { "timestamp": "02:15", "seconds": 135, "reason": "diagrama de arquitetura" },
    { "timestamp": "05:40", "seconds": 340, "reason": "código-fonte da função na IDE" }
  ]
}
\`\`\`

REGRAS:
- Peça no máximo 20 timestamps mais importantes e relevantes.
- Se o vídeo for puramente falado/discursivo sem telas ou slides (ex: entrevista, podcast), defina "has_visual_content": false e "timestamps": [].

TRANSCRIÇÃO DO VÍDEO:
---
${transcript}
---`;
}

/**
 * Builds the user prompt payload for Gemini (text-only fallback).
 */
export function buildYouTubeSummaryPrompt(
  title: string,
  channel: string,
  transcript: string,
  durationMinutes?: number
): string {
  const durationText = durationMinutes ? ` (Duração aproximada: ~${Math.round(durationMinutes)} minutos)` : '';

  return `Por favor, elabore um resumo didático completo do seguinte vídeo do YouTube com base na sua transcrição legendada:

TÍTULO DO VÍDEO: "${title}"
CANAL / AUTOR: "${channel}"${durationText}

TRANSCRIÇÃO ORIGINAL COM MARCAÇÕES TEMPORAIS:
---
${transcript}
---

LEMBRE-SE:
- Explique todo o conteúdo ensinado de forma detalhada e didática.
- CITE AS MINUTAGENS [mm:ss] em cada seção e etapa explicada.
- Elimine 100% de jabás, patrocínios, pedidos de like/inscrição e vinhetas.
- Responda em Português com formatação Markdown primorosa.`;
}

/**
 * Builds Pass 2 Multimodal Prompt instructing Gemini to cross-review the full transcript
 * against the captured high-resolution frames (OCR of code, diagrams, phonetic correction).
 */
export function buildMultimodalSummaryPrompt(
  title: string,
  channel: string,
  transcript: string,
  framesMetadata: Array<{ timestamp: string; seconds: number; reason?: string }>,
  durationMinutes?: number
): string {
  const durationText = durationMinutes ? ` (Duração aproximada: ~${Math.round(durationMinutes)} minutos)` : '';
  const framesList = framesMetadata
    .map((f, i) => `- Imagem ${i + 1} em [${f.timestamp}] (${Math.round(f.seconds)}s)${f.reason ? `: ${f.reason}` : ''}`)
    .join('\n');

  return `Você é um instrutor e pedagogo especialista do Caderno.
Você recebeu a transcrição completa deste vídeo e ${framesMetadata.length} capturas de tela (frames em alta resolução) extraídas exatamente nos momentos mais importantes do vídeo.

TÍTULO DO VÍDEO: "${title}"
CANAL / AUTOR: "${channel}"${durationText}

LISTA DE CAPTURAS DE TELA ANEXADAS (ORDEM CRONOLÓGICA):
${framesList}

DIRETRIZES FUNDAMENTAIS DE REVISÃO CRUZADA (ÁUDIO + VISÃO COMPUTACIONAL):
1. REVISÃO CRÍTICA E CORREÇÃO DA TRANSCRIÇÃO:
   - Compare o áudio transcrito com o que está visível na tela em cada momento.
   - CORRIJA no texto os erros fonéticos e termos truncados do áudio usando os textos, nomes de ferramentas, bibliotecas e comandos visíveis nas imagens.
2. TRANSCRIÇÃO DE CÓDIGO E DIAGRAMAS REAIS:
   - Se os frames mostrarem código de programação, transcreva os blocos reais com sintaxe correta e formatação impecável em blocos com linguagem (\`\`\`typescript, \`\`\`python, etc.).
   - Se mostrarem diagramas, esquemas ou tabelas, descreva a estrutura e fluxo com riqueza de detalhes didáticos.
3. CONTEÚDO DIDÁTICO INTEGRAL & MINUTAGENS:
   - Mantenha todo o encadeamento e raciocínio ensinado no vídeo do início ao fim com riqueza conceitual.
   - CITE AS MINUTAGENS [mm:ss] em cada seção e etapa explicada.
   - Elimine 100% de jabás, patrocínios, pedidos de like/inscrição e vinhetas.
4. ESTRUTURAÇÃO EM MARKDOWN DIDÁTICO:
   - Siga a estrutura:
     * ## 🎯 Visão Geral & Objetivo [00:00]
     * ## 💡 Conceitos Fundamentais & Teoria [mm:ss]
     * ## 🛠️ Passo a Passo Detalhado (com blocos de código e diagramas reais)
     * ## ⭐ Dicas Práticas & Boas Práticas [mm:ss]
     * ## 📌 Síntese Rápida & Fixação
     * ## 🧠 Quiz de Fixação & Autoavaliação (com 3 a 5 perguntas interativas em tags <details>)

TRANSCRIÇÃO ORIGINAL COMPLETA:
---
${transcript}
---`;
}

export interface GenerateSummaryOptions {
  url: string;
  title?: string | null;
  channel?: string | null;
  forceRegenerate?: boolean;
  onProgress?: (status: string) => void;
}

export interface GenerateSummaryResult {
  summary: string;
  record: YouTubeSummaryRecord;
  transcriptResult: YouTubeTranscriptResult;
  fromCache: boolean;
  framesAnalyzed?: number;
}

/**
 * Orchestrates transcript extraction, two-pass visual scouting, and database persistence.
 */
export async function generateYouTubeSummary({
  url,
  title,
  channel,
  forceRegenerate = false,
  onProgress,
}: GenerateSummaryOptions): Promise<GenerateSummaryResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Não foi possível identificar o ID do vídeo a partir da URL fornecida.');
  }

  // Check persistent DB first if not forcing regeneration
  if (!forceRegenerate) {
    const existing = await getExistingVideoSummary(videoId);
    if (existing && existing.summary) {
      return {
        summary: existing.summary,
        record: existing,
        transcriptResult: {
          video_id: videoId,
          title: existing.title || title || 'Vídeo do YouTube',
          channel: existing.channel_name || channel || 'YouTube',
          language: 'pt',
          transcript: existing.raw_transcript || '',
        },
        fromCache: true,
      };
    }
  }

  // Verify native desktop API availability
  if (!window.api?.youtube?.fetchTranscript) {
    throw new Error(
      'A extração de legendas do YouTube é exclusiva do aplicativo Desktop do Caderno. No navegador web, use o app Desktop.'
    );
  }

  onProgress?.('Extraindo transcrição e legendas do vídeo...');

  // 1. Fetch transcript and metadata from yt-dlp native command
  const transcriptResult = await window.api.youtube.fetchTranscript(url);
  if (!transcriptResult || !transcriptResult.transcript) {
    throw new Error('Não foi possível recuperar a legenda deste vídeo no YouTube.');
  }

  const finalTitle = title || transcriptResult.title || 'Vídeo do YouTube';
  const finalChannel = channel || transcriptResult.channel || 'Canal do YouTube';
  const durationMinutes = transcriptResult.duration ? transcriptResult.duration / 60 : undefined;

  // Capped at 300k chars for resilience
  const MAX_TRANSCRIPT_CHARS = 300_000;
  const processedTranscript =
    transcriptResult.transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcriptResult.transcript.slice(0, MAX_TRANSCRIPT_CHARS) +
        '\n\n... [Transcrição truncada para respeitar limites de processamento]'
      : transcriptResult.transcript;

  let frames: YouTubeFrameResult[] = [];

  // 2. Active Visual Scouting (Pass 1) if frame extraction is natively supported
  if (window.api?.youtube?.extractFrames && window.api?.youtube?.getStream) {
    try {
      onProgress?.('Passo 1/2: Analisando transcrição e mapeando momentos visuais...');
      const scoutPrompt = buildScoutPrompt(finalTitle, finalChannel, processedTranscript);
      const { text: scoutResponse } = await promptGemini(
        scoutPrompt,
        undefined,
        [],
        undefined,
        undefined,
        45000
      );

      let scoutJson: {
        has_visual_content?: boolean;
        timestamps?: Array<{ timestamp?: string; seconds?: number; reason?: string }>;
      } | null = null;

      try {
        const match = scoutResponse.match(/\{[\s\S]*\}/);
        if (match) {
          scoutJson = JSON.parse(match[0]);
        }
      } catch (parseErr) {
        console.warn('[youtubeSummaryService] Failed to parse scout JSON:', parseErr);
      }

      if (scoutJson?.has_visual_content !== false && scoutJson?.timestamps && scoutJson.timestamps.length > 0) {
        // Normalize up to 20 valid timestamps
        const requestedTimestamps = scoutJson.timestamps
          .slice(0, 20)
          .map((t) => {
            const secs =
              typeof t.seconds === 'number' && t.seconds >= 0
                ? t.seconds
                : parseTimestampToSeconds(t.timestamp || '');
            return {
              timestamp: t.timestamp || formatSecondsToTimestamp(secs),
              seconds: secs,
              reason: t.reason || '',
            };
          })
          .filter(
            (t) =>
              t.seconds > 0 &&
              (!transcriptResult.duration || t.seconds <= transcriptResult.duration + 5)
          );

        if (requestedTimestamps.length > 0) {
          onProgress?.(`Passo 2/2: Capturando ${requestedTimestamps.length} frames de alta resolução da tela...`);
          const streamInfo = await window.api.youtube.getStream(url);
          if (streamInfo?.video_url) {
            const secondsList = requestedTimestamps.map((t) => t.seconds);
            frames = await window.api.youtube.extractFrames(streamInfo.video_url, secondsList);
          }
        }
      }
    } catch (scoutErr) {
      console.warn('[youtubeSummaryService] Visual scouting/frame extraction non-fatal error:', scoutErr);
    }
  }

  // 3. Multimodal Synthesis (Pass 2) or standard text-only generation
  let rawGeneratedText: string;

  if (frames.length > 0) {
    onProgress?.(`Sintetizando resumo enriquecido com visão computacional (${frames.length} frames)...`);
    const multimodalPrompt = buildMultimodalSummaryPrompt(
      finalTitle,
      finalChannel,
      processedTranscript,
      frames,
      durationMinutes
    );
    const mediaList = frames.map((f) => f.data_url);
    const res = await promptGemini(
      multimodalPrompt,
      mediaList,
      [],
      undefined,
      YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION,
      90000
    );
    rawGeneratedText = res.text;
  } else {
    onProgress?.('A Inteligência Artificial está elaborando o resumo didático...');
    const textPrompt = buildYouTubeSummaryPrompt(
      finalTitle,
      finalChannel,
      processedTranscript,
      durationMinutes
    );
    const res = await promptGemini(
      textPrompt,
      undefined,
      [],
      undefined,
      YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION,
      75000
    );
    rawGeneratedText = res.text;
  }

  let cleanSummary = (rawGeneratedText || '').trim();
  // Strip wrapping markdown code blocks if enveloped by Gemini
  if (cleanSummary.startsWith('```markdown') && cleanSummary.endsWith('```')) {
    cleanSummary = cleanSummary.slice(11, -3).trim();
  } else if (cleanSummary.startsWith('```md') && cleanSummary.endsWith('```')) {
    cleanSummary = cleanSummary.slice(5, -3).trim();
  }

  if (!cleanSummary) {
    throw new Error('A inteligência artificial não retornou nenhum texto para o resumo.');
  }

  // 4. Persist in local database for 0ms future retrieval
  if (window.api?.youtube?.saveSummary) {
    try {
      await window.api.youtube.saveSummary(
        videoId,
        finalTitle,
        finalChannel,
        cleanSummary,
        transcriptResult.transcript
      );
    } catch (saveErr) {
      console.warn('[youtubeSummaryService] Failed to persist summary to SQLite:', saveErr);
    }
  }

  const newRecord: YouTubeSummaryRecord = {
    id: videoId,
    video_id: videoId,
    title: finalTitle,
    channel_name: finalChannel,
    summary: cleanSummary,
    raw_transcript: transcriptResult.transcript,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memorySummaryCache.set(videoId, newRecord);

  // Dispatch custom event so active link preview cards reactively update their hover pill state
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('youtube-summary-saved', { detail: { videoId } })
    );
  }

  return {
    summary: cleanSummary,
    record: newRecord,
    transcriptResult,
    fromCache: false,
    framesAnalyzed: frames.length,
  };
}
