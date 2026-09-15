import { promptGemini } from '../gemini';
import { distillHtmlContent, type DistilledContent } from './linkContentDistiller';
import { getLinkEntity, saveLinkEntity } from '../link-vault/linkVaultService';
import { getDecryptedScrap } from '../scrap/scrap-storage';
import { isYouTubeUrl, getVideoId } from '../../components/editor-extensions/links/youtubeUtils';
import { getExistingVideoSummary } from '../youtube/youtubeSummaryService';
import { isDesktopApp } from '../platform';

export interface LinkInfoResult {
  url: string;
  title: string;
  domain: string;
  summary: string;
  distilled: DistilledContent;
  hasVideoTranscript: boolean;
  isCached: boolean;
  createdAt: string;
}

export type ProgressCallback = (statusText: string) => void;

/**
 * Robust pedagogical system instruction for Link Intelligence.
 */
export const LINK_INFO_SYSTEM_INSTRUCTION = `Você é o Analista de Pesquisa e Instrutor Pedagógico de Elite do aplicativo Caderno.
Sua missão é analisar o conteúdo higienizado e o contexto multimodal extraído de um link web (artigo, documentação, repositório ou página com vídeos e imagens) e produzir uma síntese didática de alto nível.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIRETRIZES FUNDAMENTAIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. FOCO NO VALOR COGNITIVO REAL: Elimine todo e qualquer ruído comercial, chamadas promocionais, banners de cookies ou conversas paralelas. Extraia exclusivamente o CONHECIMENTO PRÁTICO E CONCEITUAL.
2. INTEGRAÇÃO MULTIMODAL: Se houver transcrição de vídeo fornecida no contexto, use as informações explicadas no vídeo e mencione minutagens [mm:ss] quando relevante. Se houver imagens conceituais, mencione como elas ilustram os tópicos.
3. PRECISÃO & CLAREZA: Defina conceitos-chave e terminologias técnicas em negrito.
4. DIAGRAMA MERMAID CONCEITUAL: Sempre que o assunto envolver processos, decisões, arquiteturas, fluxos ou relações conceituais, inclua 1 diagrama vertical em bloco \`\`\`mermaid (preferencialmente flowchart TD) com rótulos concisos entre aspas.
5. FORMATAÇÃO IMPECÁVEL: Use cabeçalhos claros, listas objetivas e formatação elegante em Markdown.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUTURA SUGERIDA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> **💡 Síntese Executiva**: (2 a 3 frases objetivas com o resumo essencial do recurso)

### 🎯 1. Objetivo & Ideia Central
- O que este link aborda e por que é relevante.

### 🔍 2. Conceitos-Chave & Explicação Aprofundada
- Detalhamento estruturado dos tópicos principais.
- Termos técnicos destacados em negrito.

### 📊 3. Fluxo ou Estrutura Conceitual (Se aplicável)
\`\`\`mermaid
flowchart TD
  ...
\`\`\`

### 🎬 4. Recursos Multimídia & Fontes Encontradas
- Síntese dos vídeos/legendas, imagens conceituais ou referências externas identificadas.

### 📌 5. Principais Conclusões & Aplicações Práticas
- 3 a 5 pontos essenciais para fixação imediata.

### 🧠 6. Autoavaliação Rápida
- Uma pergunta de reflexão com resposta expansível:
<details>
<summary>Gabarito Comentado</summary>
...
</details>`;

/**
 * Fetches raw HTML for a URL using local offline snapshot if available,
 * or network with fallback proxies.
 */
export async function fetchRawPageHtml(
  url: string,
  options?: {
    scrapId?: string | null;
    scrapDriveFileId?: string | null;
    scrapLocalPath?: string | null;
    masterKey?: CryptoKey;
  }
): Promise<string> {
  // 1. Try local decrypted snapshot if one already exists
  if (options?.scrapId) {
    try {
      const decrypted = await getDecryptedScrap(
        options.scrapId,
        options.scrapDriveFileId,
        options.scrapLocalPath,
        options.masterKey
      );
      if (decrypted && decrypted.length > 50) {
        return decrypted;
      }
    } catch (scrapErr) {
      console.warn('[LinkInfo] Snapshot offline indisponível, buscando via rede:', scrapErr);
    }
  }

  // 2. Fetch directly via native browser client in Desktop
  if (isDesktopApp()) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 50) return text;
      }
    } catch (fetchErr) {
      console.warn('[LinkInfo] Fetch direto falhou no Desktop, tentando proxies:', fetchErr);
    }
  }

  // 3. Web or CORS fallback cascade
  const proxies = [
    async () => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('AllOrigins falhou');
      const data = await res.json();
      return typeof data?.contents === 'string' ? data.contents : '';
    },
    async () => {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Codetabs falhou');
      return await res.text();
    },
    async () => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('CORSProxy falhou');
      return await res.text();
    },
    async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Direct fetch falhou');
      return await res.text();
    },
  ];

  for (const proxyFn of proxies) {
    try {
      const html = await proxyFn();
      if (html && html.length > 50) {
        return html;
      }
    } catch {}
  }

  throw new Error('Não foi possível obter o conteúdo da página. Verifique a conexão com a internet ou as restrições do site.');
}

/**
 * Attempts to retrieve video subtitles/transcripts if video features are available.
 */
async function fetchSubtitlesForVideo(videoIdOrUrl: string): Promise<string | null> {
  if (window.api?.youtube?.fetchTranscript) {
    try {
      const res = await window.api.youtube.fetchTranscript(videoIdOrUrl);
      if (typeof res?.transcript === 'string' && res.transcript.trim().length > 0) {
        return res.transcript.slice(0, 15000);
      }
    } catch (err) {
      console.warn(`[LinkInfo] Could not retrieve subtitles for video ${videoIdOrUrl}:`, err);
    }
  }
  return null;
}

/**
 * Orchestrates full link analysis, distillation, multimodal extraction and AI synthesis.
 */
export async function getOrGenerateLinkInfo(
  url: string,
  options?: {
    forceRegenerate?: boolean;
    scrapId?: string | null;
    scrapDriveFileId?: string | null;
    scrapLocalPath?: string | null;
    masterKey?: CryptoKey;
    onProgress?: ProgressCallback;
  }
): Promise<LinkInfoResult> {
  const onProgress = options?.onProgress || (() => {});
  const domain = (() => {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
      return '';
    }
  })();

  // 1. Check existing entity in Link Vault (0ms instantaneous return if cached)
  if (!options?.forceRegenerate) {
    const existing = await getLinkEntity(url);
    if (existing?.aiSummary) {
      return {
        url,
        title: existing.title || domain || url,
        domain,
        summary: existing.aiSummary,
        distilled: {
          title: existing.title || domain,
          cleanText: '',
          embeddedYouTubeVideoIds: [],
          keyImages: [],
          keyOutboundLinks: [],
          wordCount: 0,
        },
        hasVideoTranscript: false,
        isCached: true,
        createdAt: existing.aiSummaryCreatedAt || new Date().toISOString(),
      };
    }

    // Check if a YouTube video summary was already generated via YouTube service
    const ytVideoId = getVideoId(url);
    if (ytVideoId) {
      try {
        const ytRecord = await getExistingVideoSummary(ytVideoId);
        if (ytRecord?.summary) {
          saveLinkEntity({
            url,
            title: ytRecord.title || domain || url,
            channel: ytRecord.channel_name || null,
            domain,
            aiSummary: ytRecord.summary,
            aiSummaryCreatedAt: ytRecord.created_at,
            aiSummaryModel: 'gemini',
          }).catch(() => {});

          return {
            url,
            title: ytRecord.title || domain || url,
            domain,
            summary: ytRecord.summary,
            distilled: {
              title: ytRecord.title || domain,
              cleanText: ytRecord.raw_transcript || '',
              embeddedYouTubeVideoIds: [ytVideoId],
              keyImages: [],
              keyOutboundLinks: [],
              wordCount: 0,
            },
            hasVideoTranscript: Boolean(ytRecord.raw_transcript),
            isCached: true,
            createdAt: ytRecord.created_at || new Date().toISOString(),
          };
        }
      } catch {}
    }
  }

  // 2. Fetch page HTML
  onProgress('Conectando e obtendo o conteúdo da página...');
  let rawHtml = '';
  const isDirectYouTube = isYouTubeUrl(url);

  if (!isDirectYouTube) {
    try {
      rawHtml = await fetchRawPageHtml(url, options);
    } catch (fetchErr: any) {
      console.warn('[LinkInfo] Falha ao baixar HTML completo:', fetchErr);
    }
  }

  // 3. Distill HTML
  onProgress('Higienizando o conteúdo e removendo anúncios...');
  const distilled = distillHtmlContent(rawHtml, url);
  const pageTitle = distilled.title || domain || url;

  // 4. Multimodal Discovery: Video Subtitles
  onProgress('Identificando vídeos, legendas e imagens conceituais...');
  let videoTranscriptContext = '';
  let hasVideoTranscript = false;

  // Check if primary URL is a YouTube video
  if (isDirectYouTube) {
    const vid = getVideoId(url);
    if (vid) {
      const transcript = await fetchSubtitlesForVideo(url);
      if (transcript) {
        hasVideoTranscript = true;
        videoTranscriptContext = `\n\n### [TRANSCRIÇÃO E LEGENDAS DO VÍDEO PRINCIPAL]:\n${transcript}\n`;
      }
    }
  } else if (distilled.embeddedYouTubeVideoIds.length > 0) {
    // Check first embedded video
    const firstVid = distilled.embeddedYouTubeVideoIds[0];
    const transcript = await fetchSubtitlesForVideo(`https://www.youtube.com/watch?v=${firstVid}`);
    if (transcript) {
      hasVideoTranscript = true;
      videoTranscriptContext = `\n\n### [TRANSCRIÇÃO DO VÍDEO EMBUTIDO NA PÁGINA (ID: ${firstVid})]:\n${transcript}\n`;
    }
  }

  // 5. Construct AI Prompt Payload
  onProgress('A Inteligência Artificial está sintetizando o resumo pedagógico...');

  let mediaDetails = '';
  if (distilled.keyImages.length > 0) {
    mediaDetails += `\n- Imagens Conceituais Encontradas: ${distilled.keyImages
      .map((img) => img.caption ? `${img.caption} (${img.src})` : img.src)
      .join(', ')}`;
  }
  if (distilled.keyOutboundLinks.length > 0) {
    mediaDetails += `\n- Principais Fontes Citadas: ${distilled.keyOutboundLinks
      .map((l) => `[${l.text}](${l.href})`)
      .join(', ')}`;
  }

  const promptContent = `Analise este recurso web e elabore um resumo instrutivo e aprofundado:

- URL: ${url}
- Domínio: ${domain}
- Título Identificado: ${pageTitle}
${mediaDetails}

---
CONTEÚDO TEXTUAL PRINCIPAL (HIGIENIZADO):
${distilled.cleanText || '(Conteúdo textual reduzido ou protegido; utilize os dados da URL e mídias para sintetizar o assunto)'}
${videoTranscriptContext}`;

  // 6. Submit to Gemini AI with Rotated Key Resilience
  const geminiResponse = await promptGemini(
    promptContent,
    undefined,
    [],
    undefined,
    LINK_INFO_SYSTEM_INSTRUCTION,
    50000 // 50s timeout
  );

  const summary = geminiResponse.text;
  const nowIso = new Date().toISOString();

  // 7. Persist to Link Vault
  await saveLinkEntity({
    url,
    title: pageTitle,
    domain,
    aiSummary: summary,
    aiSummaryCreatedAt: nowIso,
    aiSummaryModel: 'gemini',
  });

  return {
    url,
    title: pageTitle,
    domain,
    summary,
    distilled,
    hasVideoTranscript,
    isCached: false,
    createdAt: nowIso,
  };
}
