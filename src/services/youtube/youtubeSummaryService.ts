import { promptGemini } from '../gemini';
import type { YouTubeSummaryRecord, YouTubeTranscriptResult } from '../../api/types';

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
     * ## 📌 Síntese Rápida & Fixação (Resumo consolidado dos pontos-chave para revisão rápida)`;

/**
 * Builds the user prompt payload for Gemini.
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

export interface GenerateSummaryOptions {
  url: string;
  title?: string | null;
  channel?: string | null;
  forceRegenerate?: boolean;
}

export interface GenerateSummaryResult {
  summary: string;
  record: YouTubeSummaryRecord;
  transcriptResult: YouTubeTranscriptResult;
  fromCache: boolean;
}

/**
 * Orchestrates transcript extraction, AI generation, and database persistence.
 */
export async function generateYouTubeSummary({
  url,
  title,
  channel,
  forceRegenerate = false,
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

  // 1. Fetch transcript and metadata from yt-dlp native command
  const transcriptResult = await window.api.youtube.fetchTranscript(url);
  if (!transcriptResult || !transcriptResult.transcript) {
    throw new Error('Não foi possível recuperar a legenda deste vídeo no YouTube.');
  }

  const finalTitle = title || transcriptResult.title || 'Vídeo do YouTube';
  const finalChannel = channel || transcriptResult.channel || 'Canal do YouTube';
  const durationMinutes = transcriptResult.duration ? transcriptResult.duration / 60 : undefined;

  // 2. Build didactic prompt with timestamp instructions (capped at 300k chars for resilience)
  const MAX_TRANSCRIPT_CHARS = 300_000;
  const processedTranscript =
    transcriptResult.transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcriptResult.transcript.slice(0, MAX_TRANSCRIPT_CHARS) +
        '\n\n... [Transcrição truncada para respeitar limites de processamento]'
      : transcriptResult.transcript;

  const prompt = buildYouTubeSummaryPrompt(
    finalTitle,
    finalChannel,
    processedTranscript,
    durationMinutes
  );

  // 3. Prompt Gemini AI with key rotation and resilient timeout
  const { text: rawGeneratedText } = await promptGemini(
    prompt,
    undefined,
    [],
    undefined,
    YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION,
    75000 // 75 seconds for comprehensive long video transcripts
  );

  let cleanSummary = (rawGeneratedText || '').trim();
  // Strip any wrapping ```markdown ... ``` fence if Gemini enveloped the whole text in one
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
  };
}
