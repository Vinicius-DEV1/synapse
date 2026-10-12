import type { LibraryBook } from '../../types';
import { promptGemini } from '../gemini/client';
import { getGeminiKeys, getRotatedActiveKeys } from '../gemini/keys';

export interface EnrichedMetadata {
  title?: string;
  author?: string;
  publisher?: string;
  published_year?: number;
  language?: string;
  cover_image?: string;
  description?: string;
}

/**
 * Extracts raw text from the first few sections of an in-memory EPUB book
 * (folha de rosto, ficha catalográfica, copyright, introdução).
 */
export async function extractBookInitialSnippet(epubBook: unknown, maxChars = 5000): Promise<string> {
  try {
    const bookWithSpine = epubBook as {
      spine?: {
        spineItems?: Array<{
          load: (loader: unknown) => Promise<void>;
          unload: () => void;
          document?: Document;
        }>;
      };
      load?: (url: string) => Promise<unknown>;
    };

    const items = bookWithSpine?.spine?.spineItems;
    if (!Array.isArray(items) || items.length === 0 || !bookWithSpine.load) return '';

    let accumulated = '';
    const limit = Math.min(6, items.length);

    for (let i = 0; i < limit; i++) {
      const item = items[i];
      if (item) {
        await item.load(bookWithSpine.load.bind(bookWithSpine));
        if (item.document?.body) {
          const text = item.document.body.innerText || item.document.body.textContent || '';
          if (text.trim().length > 0) {
            accumulated += `\n--- [Página/Seção Inicial ${i + 1}] ---\n` + text.trim();
          }
        }
        item.unload();
        if (accumulated.length >= maxChars) break;
      }
    }

    return accumulated.slice(0, maxChars).trim();
  } catch (err) {
    console.debug('[BookMetadataEnricher] Failed to extract initial snippet:', err);
    return '';
  }
}

/**
 * Tries to extract an initial text snippet from a book file (EPUB or PDF)
 * using the canonical buffer resolver when the reader is not yet open.
 */
export async function extractSnippetFromBook(book: Partial<LibraryBook>): Promise<string> {
  if (!book.id && !book.file_path) return '';

  try {
    const { resolveCanonicalBuffer } = await import('../storage/canonical-resolver');
    const isPdf = Boolean(
      book.file_path?.toLowerCase().endsWith('.pdf') ||
      book.original_name?.toLowerCase().endsWith('.pdf')
    );
    const ext = isPdf ? 'pdf' : 'epub';

    const buffer = await resolveCanonicalBuffer({
      moduleName: 'library',
      id: book.id || 'temp',
      savedPath: book.file_path,
      driveFileId: book.drive_file_id,
      extHint: ext,
    });

    if (!buffer || buffer.byteLength === 0) return '';

    if (isPdf) {
      const { extractTextFromPdf } = await import('../../utils/pdf-text-extractor');
      return await extractTextFromPdf(buffer, 3);
    } else {
      const ePub = (await import('epubjs')).default;
      const epubBook = ePub(buffer, { replacements: 'none' });
      await epubBook.ready;
      const snippet = await extractBookInitialSnippet(epubBook, 5000);
      if (typeof (epubBook as { destroy?: () => void }).destroy === 'function') {
        (epubBook as { destroy: () => void }).destroy();
      }
      return snippet;
    }
  } catch (err) {
    console.debug('[BookMetadataEnricher] Could not resolve book snippet:', err);
    return '';
  }
}

/**
 * Normalizes and strips file extensions, bracketed tags, and common release signatures.
 * e.g. "[OceanofPDF.com] As 48 Leis do Poder - Robert Greene.epub" -> "As 48 Leis do Poder - Robert Greene"
 */
export function sanitizeBookQuery(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\.(epub|pdf|mobi|azw3)$/i, '')
    .replace(/\[[^\]]+\]/g, '') // remove [OceanofPDF], [dlivros], etc.
    .replace(/\([^)]*(\b\d{4}\b|edition|livro|epub|pdf)[^)]*\)/gi, '')
    .replace(/[_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts title and author heuristics from common filename formats:
 * "Title - Author" or "Author - Title"
 */
export function extractFilenameHeuristics(filename: string): { titleCandidate: string; authorCandidate?: string } {
  const clean = sanitizeBookQuery(filename);
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        titleCandidate: parts[0],
        authorCandidate: parts[1],
      };
    }
  }
  return { titleCandidate: clean };
}

/**
 * Queries Open Library search API for book metadata and high-resolution cover.
 */
export async function searchOpenLibrary(query: string): Promise<EnrichedMetadata | null> {
  const sanitized = sanitizeBookQuery(query);
  if (!sanitized) return null;

  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(sanitized)}&fields=title,author_name,publisher,first_publish_year,cover_i,language&limit=3`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json();
    const docs = Array.isArray(data.docs) ? data.docs : [];
    if (docs.length === 0) return null;

    // Pick first doc that has author or cover
    const bestDoc = docs.find((d: { author_name?: string[]; cover_i?: number }) => d.author_name?.length || d.cover_i) || docs[0];

    const authors = Array.isArray(bestDoc.author_name) && bestDoc.author_name.length > 0
      ? bestDoc.author_name.join(', ')
      : undefined;

    const publisher = Array.isArray(bestDoc.publisher) && bestDoc.publisher.length > 0
      ? bestDoc.publisher[0]
      : undefined;

    const year = typeof bestDoc.first_publish_year === 'number'
      ? bestDoc.first_publish_year
      : undefined;

    // Prioritize Portuguese if present in the languages array
    let lang: string | undefined = undefined;
    if (Array.isArray(bestDoc.language) && bestDoc.language.length > 0) {
      if (bestDoc.language.includes('por')) {
        lang = 'pt';
      } else if (bestDoc.language.includes('eng')) {
        lang = 'en';
      } else if (bestDoc.language.includes('spa')) {
        lang = 'es';
      }
      // Do not assign random foreign languages (e.g. 'rus') to books searched in other languages
    }

    const cover = bestDoc.cover_i
      ? `https://covers.openlibrary.org/b/id/${bestDoc.cover_i}-L.jpg`
      : undefined;

    return {
      title: bestDoc.title || undefined,
      author: authors,
      publisher,
      published_year: year,
      language: lang,
      cover_image: cover,
    };
  } catch (err) {
    console.debug('[BookMetadataEnricher] OpenLibrary search failed:', err);
    return null;
  }
}

/**
 * Checks if a string has strong Portuguese markers or words to avoid converting to English.
 */
function seemsPortuguese(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const ptPatterns = [
    /\b(o|a|os|as|um|uma|de|do|da|dos|das|no|na|nos|nas|em|para|com|por|que|se|não|leis|poder|livro|edição|capítulo)\b/i,
    /[ãõáéíóúâêîôûàç]/i,
  ];
  return ptPatterns.some(p => p.test(lower));
}

/**
 * Uses Gemini AI with Google Search grounding and initial book pages (ficha catalográfica)
 * to infer precise, hallucination-free metadata.
 */
export async function searchWithAI(rawText: string, initialSnippet?: string): Promise<EnrichedMetadata | null> {
  try {
    const keys = await getGeminiKeys();
    const active = getRotatedActiveKeys(keys);
    if (active.length === 0) return null;

    const systemInstruction = `Você é um bibliotecário e catalogador bibliográfico profissional de altíssima precisão e rigor editorial.
Sua missão é identificar e validar os metadados canônicos e reais de um livro a partir das páginas iniciais fornecidas (folha de rosto, ficha catalográfica / CIP, copyright e créditos) e através de busca ativa na web (Google Search).

DIRETRIZES FUNDAMENTAIS DE PRECISÃO E ANTI-ALUCINAÇÃO:
1. RIGOR MÁXIMO E ZERO ALUCINAÇÃO:
   - Jamais invente ou deduza nomes de autores, editoras, anos de publicação ou títulos.
   - Não invente edições ou dados que você não comprove.
   - Se uma informação não for comprovada com absoluta certeza nem nas páginas do livro nem na busca na internet, retorne OBRIGATORIAMENTE null para esse campo.
   - NUNCA retorne valores genéricos ou placeholders como "Desconhecido", "Autor Desconhecido", "Editora Independente" ou "N/A". Se não tiver certeza comprovada, use null.

2. FONTES E PESQUISA NA WEB:
   - As páginas iniciais fornecidas (ficha catalográfica / CIP, folha de rosto, copyright) são a fonte primária de verdade daquela edição específica.
   - Realize pesquisa na web para confirmar a grafia canônica do título oficial, autor(es), editora oficial e ano de publicação.
   - Elimine qualquer tag de sites de download, pirate rips, ou nomes de arquivos (ex: [OceanofPDF], [dlivros], edições piratas, sufixos .epub/.pdf).

3. PRESERVAÇÃO RIGOROSA DO IDIOMA DA EDIÇÃO E DO TÍTULO:
   - O campo "title" DEVE OBRIGATORIAMENTE manter o título no mesmo idioma da edição fornecida nas páginas iniciais e texto do arquivo. Se a obra/edição está em português (ex: "As 48 Leis do Poder"), mantenha "As 48 Leis do Poder", JAMAIS traduza ou converta para o título em inglês ("The 48 Laws of Power") ou outra língua original.
   - O campo "language" DEVE refletir o idioma real em que o livro fornecido está escrito (ex: 'pt-BR' ou 'pt' para livros em português, 'en' para inglês). JAMAIS retorne códigos de traduções de outros países (como russo, etc.).

4. CAMPOS RETORNADOS (ESTRITAMENTE JSON):
   Retorne EXCLUSIVAMENTE um objeto JSON válido, sem blocos explicativos ou markdown ao redor:
{
  "title": "Título da Edição no Idioma Real da Obra ou null",
  "author": "Nome Completo do Autor ou Autores principais ou null",
  "publisher": "Nome Oficial da Editora responsável ou null",
  "published_year": número do ano de publicação ou null,
  "language": "Código ISO do idioma (ex: 'pt-BR', 'pt', 'en') ou null",
  "description": "Sinopse factual, concisa e fidedigna da obra no mesmo idioma da edição ou null"
}`;

    let userPrompt = `Identifique e valide com rigor os metadados bibliográficos do livro: "${rawText}"`;
    if (initialSnippet && initialSnippet.trim().length > 0) {
      userPrompt += `\n\n--- [PÁGINAS INICIAIS DA OBRA (FOLHA DE ROSTO / FICHA CATALOGRÁFICA / COPYRIGHT)] ---\n"""\n${initialSnippet}\n"""\n--- [FIM DO TEXTO EXTRAÍDO] ---\n\nINSTRUÇÕES DE EXECUÇÃO:
1. Analise atentamente a folha de rosto, ficha catalográfica (CIP) e copyright acima para extrair título, autor(es), editora e ano da edição.
2. Realize uma busca detalhada na web (Google Search) para confirmar as informações bibliográficas oficiais, verificar a grafia canônica e obter a sinopse factual.
3. Se o texto acima estiver em português, o título DEVE permanecer em português (ex: "As 48 Leis do Poder", NÃO "The 48 Laws of Power") e o idioma DEVE ser 'pt-BR' ou 'pt'.
4. Se qualquer informação for duvidosa ou não puder ser confirmada com 100% de certeza, preencha o campo correspondente com null. Jamais invente ou deduza nada.
5. Retorne estritamente o JSON requisitado.`;
    } else {
      userPrompt += `\n\nINSTRUÇÕES DE EXECUÇÃO:
1. Realize uma busca aprofundada na web (Google Search) para identificar o título canônico (no idioma da consulta), autor(es) oficiais, editora responsável, ano de publicação e sinopse deste livro.
2. Se a consulta for em português, mantenha o título em português e o idioma como 'pt-BR' ou 'pt'. NUNCA converta para inglês.
3. NUNCA invente nenhuma informação. Se algum campo não puder ser comprovado com certeza absoluta, retorne null para ele.
4. Retorne estritamente o JSON requisitado.`;
    }

    let response;
    try {
      // First try with Google Search grounding tool
      response = await promptGemini(
        userPrompt,
        undefined,
        [],
        undefined,
        systemInstruction,
        18000,
        [{ googleSearch: {} }]
      );
    } catch {
      // Fallback without search tool if key doesn't permit grounding
      response = await promptGemini(
        userPrompt,
        undefined,
        [],
        undefined,
        systemInstruction,
        15000
      );
    }

    if (!response?.text) return null;

    const jsonText = response.text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    const isNonEmptyString = (val: unknown): val is string =>
      typeof val === 'string' && val.trim().length > 0 && val.trim().toLowerCase() !== 'null';

    return {
      title: isNonEmptyString(parsed.title) ? parsed.title.trim() : undefined,
      author:
        isNonEmptyString(parsed.author) &&
        parsed.author.trim() !== 'Desconhecido' &&
        parsed.author.trim().toLowerCase() !== 'unknown'
          ? parsed.author.trim()
          : undefined,
      publisher:
        isNonEmptyString(parsed.publisher) &&
        parsed.publisher.trim() !== 'Não informada' &&
        parsed.publisher.trim().toLowerCase() !== 'unknown'
          ? parsed.publisher.trim()
          : undefined,
      published_year:
        typeof parsed.published_year === 'number' && parsed.published_year > 1000 && parsed.published_year <= 2100
          ? parsed.published_year
          : undefined,
      language: isNonEmptyString(parsed.language) ? parsed.language.trim() : undefined,
      description: isNonEmptyString(parsed.description) ? parsed.description.trim() : undefined,
    };
  } catch (err) {
    console.debug('[BookMetadataEnricher] AI search failed:', err);
    return null;
  }
}

/**
 * Cascading asynchronous book metadata enrichment pipeline.
 * Runs non-blocking in background without stalling file imports or UI.
 */
export async function autoEnrichBookMetadata(
  book: Partial<LibraryBook>,
  options: { allowAI?: boolean; initialSnippet?: string } = { allowAI: true }
): Promise<Partial<LibraryBook> | null> {
  const isAuthorMissing = !book.author || book.author === 'Desconhecido' || book.author.trim() === '';
  const isPublisherMissing = !book.publisher || book.publisher === 'Não informada';
  const isYearMissing = !book.published_year;
  const isCoverMissing = !book.cover_image;
  const isLangMissing = !book.language;

  if (!isAuthorMissing && !isPublisherMissing && !isYearMissing && !isCoverMissing && !isLangMissing) {
    return null; // Already fully enriched
  }

  const rawQuery = book.title || book.original_name || '';
  const heuristics = extractFilenameHeuristics(rawQuery);
  const searchQuery = heuristics.authorCandidate
    ? `${heuristics.titleCandidate} ${heuristics.authorCandidate}`
    : heuristics.titleCandidate;

  let enriched: EnrichedMetadata | null = null;

  // Resolve snippet if AI is enabled and we have book reference
  let initialSnippet = options.initialSnippet;
  if (options.allowAI && !initialSnippet && (book.id || book.file_path)) {
    initialSnippet = await extractSnippetFromBook(book);
  }

  // 1. If we have initial book pages (folha de rosto/ficha catalográfica), AI is the highest-fidelity source
  if (options.allowAI && initialSnippet && initialSnippet.trim().length > 0) {
    const aiEnriched = await searchWithAI(rawQuery, initialSnippet);
    if (aiEnriched) {
      enriched = { ...aiEnriched };
    }
  }

  // 2. Open Library search (used for missing fields or as secondary fallback / high-res cover provider)
  if (!enriched || !enriched.author || !enriched.publisher || isCoverMissing) {
    const olEnriched = await searchOpenLibrary(searchQuery) ||
      (heuristics.titleCandidate && heuristics.titleCandidate !== searchQuery
        ? await searchOpenLibrary(heuristics.titleCandidate)
        : null);

    if (olEnriched) {
      if (!enriched) {
        enriched = olEnriched;
      } else {
        // Merge Open Library, but protect against overwriting Portuguese title or language with English/random OL data
        const preserveTitle = enriched.title || (seemsPortuguese(heuristics.titleCandidate) ? heuristics.titleCandidate : undefined);
        const preserveLang = enriched.language;

        enriched = {
          ...olEnriched,
          ...enriched, // AI takes precedence
          title: preserveTitle || olEnriched.title,
          language: preserveLang || (seemsPortuguese(heuristics.titleCandidate) ? 'pt-BR' : olEnriched.language),
          cover_image: enriched.cover_image || olEnriched.cover_image,
        };
      }
    }
  }

  // 3. Fall back to AI without snippet if still incomplete
  if (options.allowAI && (!enriched || !enriched.author || !enriched.publisher)) {
    const aiEnriched = await searchWithAI(rawQuery);
    if (aiEnriched) {
      enriched = {
        ...enriched,
        ...aiEnriched,
        cover_image: enriched?.cover_image || aiEnriched.cover_image,
      };
    }
  }

  // Fallback to filename heuristic author if nothing else found
  if ((!enriched || !enriched.author) && heuristics.authorCandidate && isAuthorMissing) {
    enriched = {
      ...enriched,
      title: heuristics.titleCandidate,
      author: heuristics.authorCandidate,
    };
  }

  if (!enriched) return null;

  const updates: Partial<LibraryBook> = {};

  if (isAuthorMissing && enriched.author) {
    updates.author = enriched.author;
  }
  if (isPublisherMissing && enriched.publisher) {
    updates.publisher = enriched.publisher;
  }
  if (isYearMissing && enriched.published_year) {
    updates.published_year = enriched.published_year;
  }
  if (!book.language && enriched.language) {
    updates.language = enriched.language;
  }
  if (isCoverMissing && enriched.cover_image) {
    updates.cover_image = enriched.cover_image;
  }
  if (enriched.description) {
    updates.description = enriched.description;
  }
  // Clean up title if currently using raw noisy filename and a verified title was found
  if (enriched.title && heuristics.authorCandidate && book.title?.includes(' - ')) {
    // Never convert a title that was Portuguese into English
    if (!seemsPortuguese(heuristics.titleCandidate) || seemsPortuguese(enriched.title)) {
      updates.title = enriched.title;
    } else {
      updates.title = heuristics.titleCandidate;
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}
