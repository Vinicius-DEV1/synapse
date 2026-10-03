import type { CultureType } from '../../types/culture';
import type { UserCulturalDNA } from './culture-dna-extractor';
import type { FreshReleaseAnchor } from './culture-fresh-releases';
import type { SerendipityMode, AiCulturalDnaProfile } from '../../types/culture-recommendations';

export const CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT = `You are Caderno's elite Cultural Curator and AI Recommendation Engine.
Your purpose is to deliver deeply personalized, tasteful, and diverse cultural recommendations across movies, TV series, anime, manga, books, and graphic novels.

Key Principles:
1. HIGH PERSONALIZATION & REASONING: Connect every suggestion to the user's explicit taste profile (their completed items, goals, themes, and favorite creators). State the affinity reason clearly in Brazilian Portuguese (PT-BR).
2. BALANCED TIERS (CLASSICS, HIDDEN GEMS, FRESH RELEASES, AND UPCOMING RADAR):
   - "recent": Brand new releases from the current season, past weeks, or even yesterday.
   - "classic": Time-tested masterpiece that defines or revolutionized the genre.
   - "hidden_gem": Lesser-known, critically acclaimed cult or indie work that the user likely hasn't heard of.
   - "upcoming": Highly anticipated future releases, announced sequels, upcoming original shows, or upcoming cinema premieres scheduled for future months/years (e.g., "Novembro 2024", "2025", "2026"). Provide "expected_release_date". For series/anime, recommend the show's canonical overarching title, NEVER individual season numbers.
3. CREATOR & AUTEUR AWARENESS: Track director, animation studio, author, and showrunner lineages. When an affinity links to a renowned creator (e.g. Denis Villeneuve, Christopher Nolan, Hayao Miyazaki, Studio Ghibli, MAPPA, Philip K. Dick), highlight it and populate the "creator" field.
4. CROSS-MEDIUM BRIDGES (Cross-pollination): Connect themes and moods across formats. If the user loves psychological sci-fi or dark fantasy, suggest matching films, HBO-caliber series, manga, and novels sharing that atmosphere. Avoid monolithic single-medium clusters unless the user strictly consumes only one medium.
5. NEGATIVE CONSTRAINTS (STRICT FILTERING):
   - NEVER suggest titles that the user already has in their library.
   - NEVER suggest alternate cuts, extended versions, director's cuts, or remastered editions of works already in the user's library (e.g. if the user has "Ex-Machina", NEVER recommend "Ex-Machina: Versão Longa" or "Ex-Machina (Extended Cut)").
   - MANDATORY SERIES & ANIME RULE: Always recommend TV series and anime by their main overarching show title (e.g., "Severance", "Succession", "Frieren"). NEVER recommend specific seasons or season numbers (e.g. do NOT output "Severance: Temporada 2" or "Succession: Temporada 3"). If the user already has any season/entry of a series in their library, that series is considered present and you MUST NOT recommend any future, current, or past seasons of it.
   - NEVER suggest titles that the user marked as disliked or already watched/read.
6. COHESIVE, MASSIVELY PACKED & ASSERTIVE THEMATIC CLUSTERS (2X DOUBLED CATALOG DENSITY):
   - STRICT COLLECTION COUNT: Maintain strictly between 4 and 5 cohesive thematic collections. Do NOT increase the number of collections (avoid vertical clutter and fragmented rows).
   - DOUBLED 2X DEPTH REQUIREMENT: Instead of adding more collections, DOUBLE the depth and breadth of each collection. Each collection must be exceptionally packed, rich, and visually substantial, containing strictly 28 to 36 high-caliber recommendations (forming 5 to 6 full rows in desktop card grids, with a target of 120 to 160+ total recommendations across the 4 to 5 collections).
   - PURITY & COHESION: Keep each collection laser-focused ('acertiva') on its distinct thematic pillar and creator lineages. Never dilute quality with generic filler.
   - BALANCED SPECTRUM: Within each dense collection of 28 to 36 works, provide a rich, engaging mix of allowed formats (movies, series, anime, books, manga) and tiers (recent, classic, hidden_gem, upcoming).
   - Include upcoming future works so the user can anticipate what to watch or read next.
7. REAL, FACTUAL WORKS ONLY & CANONICAL TITLE FIDELITY (ZERO TOLERANCE FOR FAKE ENTRIES):
   - ABSOLUTE PROHIBITION OF FAKE OR HALLUCINATED WORKS: Every single recommendation MUST be a real, factually existing, commercially released or officially announced work that exists on IMDb, AniList, TVMaze, or Google Books. NEVER invent non-existent movie/series titles and attribute them to real creators (e.g. NEVER fabricate fake films like "Quase uma Canção" by Céline Sciamma or fake series like "Luzes na Cidade" by Ryan Murphy).
   - If a specific theme or subgenre runs out of works, broaden gracefully to adjacent real works within the same mood rather than fabricating fake entries!
   - ABSOLUTE PROHIBITION OF MACHINE TRANSLATION FOR TITLES:
     * Anime & Manga: ALWAYS use the universally recognized canonical title (usually English or Romanized Japanese, e.g. "Chainsaw Man", "Sousou no Frieren", "Steins;Gate", "Jujutsu Kaisen", "Vinland Saga", "Berserk", "Monster", "Death Note", "Cowboy Bebop", "Bocchi the Rock!"). NEVER invent literal machine translations like "Homem-Motosserra", "Portão de Steins", or "Bocchi a Rocha".
     * Movies & TV Series: Use the official Brazilian Portuguese release title ONLY IF it was officially released and marketed with that name in Brazil (e.g. "Interestelar", "A Origem", "Um Sonho de Liberdade", "Ruptura", "O Poderoso Chefão", "Bastardos Inglórios"). If a movie or series is officially marketed or widely known in Brazil under its original English/foreign title (e.g. "Succession", "Stranger Things", "Slow Horses", "Breaking Bad", "Dark", "Mindhunter", "Fleabag", "The Bear", "Oppenheimer", "Dune", "Euphoria", "Twin Peaks", "True Detective"), keep that established title! NEVER create artificial translations (e.g. NEVER "Cavalos Lentos", "Coisas Estranhas", "Saco de Pulgas").
     * Books & Graphic Novels: Use the official Brazilian published title if published in Brazil (e.g. "Duna", "Neuromancer", "Fundação", "O Problema dos Três Corpos"); otherwise use the canonical original title.
   - Provide "search_hint" with the best international or original title for search indexing.
   - Provide "original_title" with the true original language title (e.g. "Sousou no Frieren", "Inception", "Slow Horses", "Shingeki no Kyojin").
8. JSON FORMAT ONLY:
   - Output must be valid JSON matching the exact schema specified in the user prompt. No Markdown formatting outside the codeblock.
`;

const ALL_CULTURE_TYPES: CultureType[] = ['filme', 'série', 'anime', 'manga', 'livro', 'hq', 'novel'];

export interface BatchPromptOptions {
  batchIndex: number;
  totalBatches: number;
  targetClusterCount?: number;
  itemsPerCluster?: number;
  seenInPreviousBatches?: string[];
  thematicFocus?: string[];
}

export function buildCultureRecommendationsPrompt(
  dna: UserCulturalDNA,
  freshAnchors: FreshReleaseAnchor[] = [],
  serendipityMode: SerendipityMode = 'safe',
  previousRecommendations: string[] = [],
  volume: 'standard' | 'expanded' | 'quadruple' = 'quadruple',
  aiDna?: AiCulturalDnaProfile | null,
  excludedTypes: CultureType[] = [],
  excludedThemes: string[] = [],
  batchOptions?: BatchPromptOptions
): string {
  const currentDate = new Date().toISOString().split('T')[0];

  const completedList = dna.completedItems
    .slice(0, 20)
    .map(i => `- ${i.title} (${i.type})`)
    .join('\n');

  const inProgressList = dna.inProgressItems
    .slice(0, 15)
    .map(i => `- ${i.title} (${i.type}, ${i.progressPercent}% assistido/lido)`)
    .join('\n');

  const goalsList = dna.goalItems
    .slice(0, 10)
    .map(i => `- ${i.title} (${i.type})`)
    .join('\n');

  // If aiDna is present, keep registered list concise to avoid token waste; otherwise include synopses
  const registeredList = (dna.registeredWorks || [])
    .slice(0, 25)
    .map(r => aiDna ? `- ${r.title} (${r.type})` : `- ${r.title} (${r.type})${r.synopsis ? `: "${r.synopsis}"` : ''}`)
    .join('\n');

  const seedsList = (dna.prioritySeeds || [])
    .map(s => `${s.title} (${s.type})`)
    .join(', ');

  const creatorList = (dna.creatorSignatures || []).join(', ');

  const dislikedList = dna.dislikedTitles
    .map(d => `- ${d.title} (${d.type}${d.reason ? `: ${d.reason}` : ''})`)
    .join('\n');

  const ignoredList = dna.ignoredTitles
    .map(ig => `- ${ig.title} (${ig.type})`)
    .join('\n');

  const libraryTitlesList = (dna.allLibraryTitles || [])
    .map(t => `- ${t}`)
    .join('\n');

  const previousRecommendationsList = previousRecommendations
    .slice(0, 200)
    .map(t => `- ${t}`)
    .join('\n');

  const anchorsList = freshAnchors
    .slice(0, 15)
    .map(a => `- [${a.type}] ${a.title}${a.releaseNote ? ` (${a.releaseNote})` : ''}`)
    .join('\n');

  const aiDnaSection = aiDna && aiDna.thematic_axes && aiDna.thematic_axes.length > 0 ? `
=== REFINED CULTURAL TASTE DNA (DEEP SEMANTIC EXTRACTION) ===
Primary Thematic Pillars & Subgenres:
${aiDna.thematic_axes.map(t => `- ${t}`).join('\n')}

Key Creator & Auteur Lineages:
${aiDna.core_influences.join(', ') || 'Eclectic'}

Emotional Atmosphere & Aesthetic Vibe:
${aiDna.emotional_atmosphere}

Defining Anchor Works:
${aiDna.key_anchor_works.join(', ')}
` : '';

  const coldStartGuidance = dna.isColdStart
    ? `NOTE: The user has an empty library (Cold Start). Present an extraordinary, multi-medium starter suite of seminal masterpieces across cinema, anime, TV, and literature to kickstart their cultural journey.`
    : aiDna && aiDna.thematic_axes && aiDna.thematic_axes.length > 0
    ? `CRITICAL TASTE ANCHOR DIRECTIVE:
You MUST anchor your thematic collections and recommendations DIRECTLY around the extracted thematic pillars (${aiDna.thematic_axes.join(', ')}) and creator lineages (${aiDna.core_influences.join(', ')}).
Build at least 2 to 3 collections immediately celebrating and exploring the universe, emotional atmosphere, and specific tropes of these anchor works!`
    : dna.totalItems < 5
    ? `CRITICAL TASTE ANCHOR DIRECTIVE:
The user currently has a focused library of ${dna.totalItems} anchor work(s): ${seedsList}.
You MUST anchor your thematic collections and recommendations DIRECTLY around the genre, themes, narrative style, emotional tone, and creator lineages of these specific works.
Do NOT invent unrelated sci-fi or action clusters if the user's registered titles are romance/coming-of-age/drama or vice versa. Build at least 2 to 3 collections immediately celebrating and exploring the themes, LGBTQIA+ narratives, coming-of-age journeys, or related universes of these anchor works!`
    : '';

  const serendipityGuidance = serendipityMode === 'explore'
    ? `EXPLORATION MODE ACTIVE (Serendipity & Horizon Expansion):
Apply lateral thinking and adventurous discovery. Suggest provocative cult films, international cinema (South Korean, Japanese, Scandinavian, French), acclaimed indie literature, and bold, poetic works that share the deep thematic DNA of the user's tastes while breaking out of standard algorithmic echo chambers.`
    : `SAFE BET MODE ACTIVE (Consolidated Taste):
Focus primarily on high-certainty, 90%+ affinity recommendations: celebrated masterpieces, direct creator continuations, and universally praised works directly in line with their favorite titles and genres.`;

  const normalizedExcludedTypes = (excludedTypes || []).filter(t => ALL_CULTURE_TYPES.includes(t));
  const allowedTypes = ALL_CULTURE_TYPES.filter(t => !normalizedExcludedTypes.includes(t));
  const effectiveAllowedTypes = allowedTypes.length > 0 ? allowedTypes : ALL_CULTURE_TYPES;

  const formatConstraintSection = normalizedExcludedTypes.length > 0 ? `
=== STRICT FORMAT EXCLUSIONS & DENSITY COMPENSATION ===
CRITICAL USER SETTING: The user has strictly EXCLUDED the following media formats from recommendations:
Excluded formats: ${normalizedExcludedTypes.join(', ')}

ALLOWED FORMATS ONLY: ${effectiveAllowedTypes.join(', ')}

MANDATORY RULES:
1. NEVER recommend any work belonging to the excluded formats: ${normalizedExcludedTypes.join(', ')}.
2. You MUST ONLY recommend works in the ALLOWED formats: ${effectiveAllowedTypes.join(', ')}.
3. REDISTRIBUTION & FULL VOLUME COMPENSATION: Because [${normalizedExcludedTypes.join(', ')}] are excluded, you MUST redistribute and complete all collections with high-caliber works of the ALLOWED formats (e.g. more ${effectiveAllowedTypes.slice(0, 3).join(', ')}). Each collection MUST still strictly achieve its full density target (28 to 36 works per collection). Do NOT leave collections sparse, half-empty, or reduce collection sizes!
` : '';

  const themeConstraintSection = (excludedThemes || []).length > 0 ? `
=== FORBIDDEN THEMES & GENRES (STRICTLY EXCLUDED) ===
CRITICAL: The user has strictly forbidden the following themes, genres, or keywords from recommendations:
${excludedThemes.map(t => `- ${t}`).join('\n')}
NEVER recommend any work that centers on, features, or is categorized under these excluded themes!
` : '';

  const volumeDirective =
    volume === 'quadruple'
      ? 'Analyze the user\'s cultural tastes and generate strictly 4 to 5 cohesive thematic collections. Each collection must be MASSIVELY PACKED with strictly 28 to 36 laser-focused, high-caliber recommendations (target 120 to 160+ total works across the 4 to 5 collections). Do NOT increase the number of collections beyond 5; instead, DOUBLE the volume of works inside each collection (forming 5 to 6 full desktop rows of cards per cluster). Every recommendation must be highly assertive, directly tied to identified creators, key themes, and undisputed artistic consensus.'
      : volume === 'expanded'
      ? 'Analyze the user\'s cultural tastes and generate strictly 4 to 5 major thematic collections with 20 to 24 laser-focused recommendations each (target 80 to 100+ total works across the collections).'
      : 'Analyze the user\'s cultural tastes and generate strictly 3 to 4 major thematic collections with 14 to 18 laser-focused recommendations each (target 45 to 65 total works).';

  const targetClusterCount = batchOptions?.targetClusterCount ?? (batchOptions?.batchIndex === 0 ? 2 : 2);
  const targetItemsPerCluster = batchOptions?.itemsPerCluster ?? 24;

  const effectiveVolumeDirective = batchOptions
    ? `Analyze the user's cultural tastes and generate strictly ${targetClusterCount} major, highly cohesive thematic collections (Batch ${batchOptions.batchIndex + 1} of ${batchOptions.totalBatches}). Each collection must be DENSELY PACKED with strictly ${targetItemsPerCluster} to ${targetItemsPerCluster + 4} laser-focused, high-caliber recommendations (target ${targetClusterCount * targetItemsPerCluster} to ${targetClusterCount * (targetItemsPerCluster + 4)} works for this batch).`
    : volumeDirective;

  const batchFocusSection = batchOptions?.thematicFocus && batchOptions.thematicFocus.length > 0 ? `
=== BATCH ${batchOptions.batchIndex + 1} PRIORITY THEMATIC FOCUS ===
For this specific batch, dedicate your ${targetClusterCount} collections to deeply exploring these thematic pillars and tropes:
${batchOptions.thematicFocus.map(f => `- ${f}`).join('\n')}
` : '';

  const previousBatchesSection = batchOptions?.seenInPreviousBatches && batchOptions.seenInPreviousBatches.length > 0 ? `
Already recommended in earlier batch of this current session (STRICTLY FORBIDDEN TO REPEAT - provide fresh new titles):
${batchOptions.seenInPreviousBatches.map(t => `- ${t}`).join('\n')}
` : '';

  const effectiveClusterCountDirective = batchOptions
    ? `Strictly maintain ${targetClusterCount} cohesive thematic collections for this batch (Batch ${batchOptions.batchIndex + 1} of ${batchOptions.totalBatches}).
Provide strictly ${targetItemsPerCluster} to ${targetItemsPerCluster + 4} high-caliber works per collection (target ${targetClusterCount * targetItemsPerCluster} to ${targetClusterCount * (targetItemsPerCluster + 4)} works for this batch), with an engaging, assertive mix of ${effectiveAllowedTypes.join(', ')}.`
    : `Strictly maintain 4 to 5 major thematic collections (do NOT increase the number of collections).
Instead, DOUBLE the quantity of recommendations in each collection: provide strictly 28 to 36 high-caliber works per collection (spanning 5 to 6 full rows of cards on desktop grids, target 120 to 160+ works across the collections), with an engaging, assertive mix of ${effectiveAllowedTypes.join(', ')}.`;

  return `Current Date: ${currentDate}


=== CURATION MODE ===
${serendipityGuidance}
${aiDnaSection}
${batchFocusSection}
${formatConstraintSection}
${themeConstraintSection}
=== USER CULTURAL PROFILE (METRICS & ANCHORS) ===
Total works registered: ${dna.totalItems}
Top formats: ${dna.topTypes.join(', ') || 'Eclectic (Open to all)'}
${dna.thematicKeywords && dna.thematicKeywords.length > 0 && !aiDna ? `Recurrent Thematic Interests: ${dna.thematicKeywords.join(', ')}` : ''}
${creatorList && !aiDna ? `Identified Favorite Creators / Authors / Studios: ${creatorList}` : ''}
${seedsList ? `Priority Anchor Works (Top Affinity): ${seedsList}` : ''}

Active Works in User's Library:
${registeredList || 'None yet'}

${completedList ? `Completed Works (High Affinity):\n${completedList}\n` : ''}${inProgressList ? `Currently In Progress:\n${inProgressList}\n` : ''}${goalsList ? `Priority Goals:\n${goalsList}\n` : ''}
${coldStartGuidance}

=== EXCLUSION LIST (ABSOLUTELY FORBIDDEN - DO NOT RECOMMEND ANY OF THESE) ===
CRITICAL: The user ALREADY HAS the following works in their personal library or has explicitly dismissed them.
You MUST NEVER recommend any work listed below, nor any duplicate, alternate spelling, extended cut, director's cut, or subsequent season of them:

Complete user library (ABSOLUTELY FORBIDDEN TO SUGGEST):
${libraryTitlesList || 'None'}

Disliked by user:
${dislikedList || 'None'}

Already watched/read by user:
${ignoredList || 'None'}
${previousRecommendationsList ? `
Previously recommended in past batches (DO NOT repeat these, suggest FRESH new discoveries):
${previousRecommendationsList}
` : ''}${previousBatchesSection}

=== REAL-TIME BROADCAST & SEASON ANCHORS (CURRENT & UPCOMING) ===
${anchorsList || 'None available currently'}

=== TASK ===
${effectiveVolumeDirective}
${effectiveClusterCountDirective}
Prioritize undeniable quality and direct auteur/creator affinity over generic filler.

Include creator lineage whenever applicable.
Mix tiers across clusters:
- "recent": Fresh releases up to current date ${currentDate}
- "classic": Timeless masterpieces
- "hidden_gem": Underrated gems
- "upcoming": Highly anticipated future releases and upcoming premieres (with "expected_release_date" such as "Novembro 2024", "2025" or "2026")

Every affinity reason and synopsis must be in warm, natural Brazilian Portuguese (PT-BR).
CRITICAL: For EVERY single recommended item, you MUST write a rich, immersive, and narrative synopsis (2 to 4 sentences in Portuguese) explaining the plot, the universe, and the main dramatic conflict without giving spoilers. Do not leave synopsis empty and do not provide simple actor lists.

=== REGRA CRÍTICA ANTI-ALUCINAÇÃO & FIDELIDADE CANÔNICA ===
1. PROIBIÇÃO TOTAL DE OBRAS INVENTADAS: Cada obra recomendada DEVE existir no mundo real e estar indexada no IMDb, AniList, TVMaze ou Google Books. JAMAIS invente títulos fictícios atribuindo a diretores ou autores reais (ex: NUNCA crie filmes como "Quase uma Canção" de Céline Sciamma ou séries como "Luzes na Cidade" de Ryan Murphy). Se um nicho temático for muito restrito, expanda com obras reais consagradas de tom ou atmosfera similares, JAMAIS invente obras falsas.
2. NUNCA faça tradução literal automática de títulos estrangeiros para o português!
- Anime e Mangá: SEMPRE utilize o título oficial consagrado (ex: "Chainsaw Man", "Sousou no Frieren", "Steins;Gate", "Jujutsu Kaisen", "Vinland Saga", "Bocchi the Rock!"). JAMAIS invente traduções literais como "Homem-Motosserra", "Portão de Steins" ou "Bocchi a Rocha".
- Filmes e Séries: Use o título oficial brasileiro APENAS se ele existir oficialmente no Brasil (ex: "Interestelar", "A Origem", "Ruptura", "Um Sonho de Liberdade"). Se a obra foi lançada ou é conhecida no Brasil com o título original em inglês (ex: "Slow Horses", "Succession", "Stranger Things", "Fleabag", "The Bear", "Mindhunter"), MANTENHA o título consagrado. JAMAIS invente traduções literais automáticas como "Cavalos Lentos" ou "Saco de Pulgas".
- Livros e HQs: Use o título publicado no Brasil se existir; caso contrário, mantenha o título original.
- original_title: Forneça sempre o título original/romanizado oficial.

Also provide accurate baseline metadata:
- "rating": Estimated public/critical consensus score out of 10 (e.g. 8.7, 8.4, 9.1).
- "platform": Primary broadcasting network, streaming service, cinema distributor, or publisher (e.g. "HBO / Max", "Apple TV+", "Netflix", "Prime Video", "FX", "Cinema", "Editora Aleph", "Shueisha").
- "origin_country": Country of origin in Portuguese (e.g. "Estados Unidos", "Japão", "Reino Unido", "Coreia do Sul", "França", "Brasil").
- "duration": Approximate runtime, episode count, or pages (e.g. "2h 49m", "10 episódios", "416 págs").
- "genres": Array of 2 to 3 main genres in Portuguese (e.g. ["Ficção Científica", "Drama"]).
- "cast": 2 to 3 main actors or key voices.

Respond with ONLY a raw JSON object in this format:
{
  "clusters": [
    {
      "id": "slug-cluster-id",
      "title": "Nome do Cluster em Português",
      "description": "Breve síntese temática deste agrupamento",
      "items": [
        {
          "title": "Título Consagrado no Brasil (Oficial PT-BR ou Original em Inglês - NUNCA tradução literal da IA)",
          "original_title": "Título Original / Romanizado",
          "type": ${effectiveAllowedTypes.map(t => `"${t}"`).join(' | ')},
          "year": 2025,
          "tier": "recent" | "classic" | "hidden_gem" | "upcoming",
          "cluster": "Nome do Cluster",
          "creator": "Dir. Christopher Nolan" | "Estúdio MAPPA" | "Autor: Isaac Asimov",
          "affinity_reason": "Porque você assistiu X e aprecia a direção de Y...",
          "synopsis": "Sinopse rica, envolvente e detalhada em português (2 a 4 frases) contextualizando a premissa, o universo e o conflito dramático central sem spoilers.",
          "confidence_score": 0.95,
          "rating": 8.7,
          "platform": "HBO / Max" | "Apple TV+" | "Netflix" | "Cinema" | "Editora Aleph",
          "origin_country": "Estados Unidos" | "Japão" | "Reino Unido",
          "duration": "2h 49m" | "10 episódios" | "416 págs",
          "genres": ["Ficção Científica", "Drama"],
          "cast": "Matthew McConaughey, Anne Hathaway",
          "release_date": "YYYY-MM-DD",
          "expected_release_date": "Outubro 2025",
          "search_hint": "Title for IMDb/Jikan API search"
        }
      ]
    }
  ]
}`;
}

export function buildExpandClusterPrompt(
  cluster: { title: string; description?: string },
  existingTitlesInCluster: string[],
  libraryTitles: string[],
  allRecommendedTitles: string[] = [],
  dislikedTitles: string[] = [],
  targetCount = 22
): string {
  const minCount = Math.max(16, targetCount - 4);
  const maxCount = Math.max(22, targetCount);

  const allAlreadySuggested = Array.from(new Set([...existingTitlesInCluster, ...allRecommendedTitles]));

  return `### TARGET CLUSTER TO EXPAND
Collection Title: "${cluster.title}"
${cluster.description ? `Theme & Mood: "${cluster.description}"` : ''}

=== STRICT NEGATIVE CONSTRAINTS (DO NOT RECOMMEND) ===
1. ALREADY RECOMMENDED IN THIS SESSION (STRICTLY FORBIDDEN TO REPEAT):
[${allAlreadySuggested.map(t => `"${t}"`).join(', ')}]

2. USER LIBRARY (ALREADY OWNED - STRICTLY FORBIDDEN):
[${libraryTitles.map(t => `"${t}"`).join(', ')}]
- Do not recommend alternate cuts, extended versions, or sequels/prequels if already owned.
- If recommending a TV series or anime, recommend the overarching show title, NEVER individual season numbers.

${dislikedTitles.length > 0 ? `3. DISLIKED BY USER (STRICTLY FORBIDDEN): [${dislikedTitles.map(t => `"${t}"`).join(', ')}]` : ''}

=== TASK ===
Generate strictly ${minCount} to ${maxCount} NEW, HIGH-QUALITY cultural recommendations that belong deeply and authentically to this specific collection "${cluster.title}".
- Guarantee full density: Provide strictly ${minCount} to ${maxCount} distinct works so the collection expands with fresh works.
- Provide a balanced mix of formats (filme, série, anime, livro, manga) and tiers (recent, classic, hidden_gem, upcoming).
- Every affinity reason and synopsis must be in warm, natural Brazilian Portuguese (PT-BR).
- For each item, write a rich, immersive 2 to 4 sentence plot synopsis in Portuguese without spoilers.
- Include estimated rating out of 10, streaming platform/origin, country of origin, duration, genres, and cast.

=== REGRA CRÍTICA ANTI-ALUCINAÇÃO & FIDELIDADE CANÔNICA ===
1. PROIBIÇÃO TOTAL DE OBRAS INVENTADAS: Todas as obras recomendadas DEVEM existir de fato no mundo real (IMDb, AniList, TVMaze, Google Books). NUNCA invente filmes, séries, animes ou livros fictícios atribuindo a diretores ou autores reais (ex: JAMAIS crie obras falsas como "Quase uma Canção" de Céline Sciamma ou "Luzes na Cidade" de Ryan Murphy). Se o nicho temático for muito específico e faltarem títulos daquele nicho exato, inclua obras consagradas adjacentes que compartilhem a mesma atmosfera, tom ou estética, MAS NUNCA INVENTE OBRAS INEXISTENTES.
2. NUNCA faça tradução literal automática de títulos estrangeiros para o português!
- Anime e Mangá: SEMPRE utilize o título oficial consagrado (ex: "Chainsaw Man", "Sousou no Frieren", "Steins;Gate", "Jujutsu Kaisen", "Vinland Saga"). JAMAIS invente traduções como "Homem-Motosserra" ou "Portão de Steins".
- Filmes e Séries: Use o título oficial brasileiro APENAS se ele existir oficialmente no Brasil (ex: "Interestelar", "A Origem", "Ruptura"). Se a obra foi lançada ou é conhecida no Brasil com o título original em inglês (ex: "Slow Horses", "Succession", "Stranger Things", "Fleabag", "The Bear"), MANTENHA o título original consagrado. JAMAIS invente traduções como "Cavalos Lentos" ou "Saco de Pulgas".
- original_title: Forneça sempre o título original/romanizado oficial.

Respond with ONLY a raw JSON object in this format:
{
  "recommendations": [
    {
      "title": "Título Consagrado no Brasil (Oficial PT-BR ou Original em Inglês - NUNCA tradução literal da IA)",
      "original_title": "Título Original / Romanizado",
      "type": "filme" | "série" | "anime" | "livro" | "manga" | "hq" | "novel",
      "year": 2024,
      "tier": "recent" | "classic" | "hidden_gem" | "upcoming",
      "cluster": "${cluster.title}",
      "creator": "Dir. Nome" | "Autor: Nome" | "Estúdio: Nome",
      "affinity_reason": "Por que esta obra se encaixa perfeitamente nesta coleção...",
      "synopsis": "Sinopse narrativa rica e envolvente em português (2 a 4 frases)...",
      "confidence_score": 0.95,
      "rating": 8.5,
      "platform": "HBO / Max" | "Netflix" | "Apple TV+" | "Cinema" | "Editora",
      "origin_country": "Estados Unidos" | "Japão" | "Reino Unido",
      "duration": "2h 10m" | "8 episódios" | "350 págs",
      "genres": ["Gênero 1", "Gênero 2"],
      "cast": "Ator 1, Ator 2",
      "expected_release_date": "Outubro 2025",
      "search_hint": "Title for API search"
    }
  ]
}`;
}

