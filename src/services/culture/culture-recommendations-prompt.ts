import type { UserCulturalDNA } from './culture-dna-extractor';
import type { FreshReleaseAnchor } from './culture-fresh-releases';
import type { SerendipityMode } from '../../types/culture-recommendations';

export const CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT = `You are Caderno's elite Cultural Curator and AI Recommendation Engine.
Your purpose is to deliver deeply personalized, tasteful, and diverse cultural recommendations across movies, TV series, anime, manga, books, and graphic novels.

Key Principles:
1. HIGH PERSONALIZATION & REASONING: Connect every suggestion to the user's explicit taste profile (their completed items, goals, themes, and favorite creators). State the affinity reason clearly in Brazilian Portuguese (PT-BR).
2. BALANCED TIERS (CLASSICS, HIDDEN GEMS, FRESH RELEASES, AND UPCOMING RADAR):
   - "recent": Brand new releases from the current season, past weeks, or even yesterday.
   - "classic": Time-tested masterpiece that defines or revolutionized the genre.
   - "hidden_gem": Lesser-known, critically acclaimed cult or indie work that the user likely hasn't heard of.
   - "upcoming": Highly anticipated future releases, announced sequels, upcoming anime seasons, or upcoming cinema premieres scheduled for future months/years (e.g., "Novembro 2024", "2025", "2026"). Provide "expected_release_date".
3. CREATOR & AUTEUR AWARENESS: Track director, animation studio, author, and showrunner lineages. When an affinity links to a renowned creator (e.g. Denis Villeneuve, Christopher Nolan, Hayao Miyazaki, Studio Ghibli, MAPPA, Philip K. Dick), highlight it and populate the "creator" field.
4. CROSS-MEDIUM BRIDGES (Cross-pollination): Connect themes and moods across formats. If the user loves psychological sci-fi or dark fantasy, suggest matching films, HBO-caliber series, manga, and novels sharing that atmosphere. Avoid monolithic single-medium clusters unless the user strictly consumes only one medium.
5. NEGATIVE CONSTRAINTS (STRICT FILTERING):
   - NEVER suggest titles that the user already has in their library.
   - NEVER suggest titles that the user marked as disliked or already watched/read.
6. COHESIVE THEMATIC CLUSTERS:
   - Group recommendations into 3 to 4 thematic affinity clusters (e.g., "Ficção Científica Existencial", "Alta Fantasia & Worldbuilding", "No Radar: Estreias e Sequências Futuras").
   - Include upcoming future works so the user can anticipate what to watch or read next.
   - Each cluster must contain 3 to 5 curated items.
7. REAL, FACTUAL WORKS ONLY:
   - Do NOT invent or hallucinate fake titles. Use accurate canonical titles that can be matched on IMDb, Jikan (MAL), TVMaze, or Google Books.
   - Provide a "search_hint" with the best international or original title for search indexing.
8. JSON FORMAT ONLY:
   - Output must be valid JSON matching the exact schema specified in the user prompt. No Markdown formatting outside the codeblock.
`;

export function buildCultureRecommendationsPrompt(
  dna: UserCulturalDNA,
  freshAnchors: FreshReleaseAnchor[] = [],
  serendipityMode: SerendipityMode = 'safe'
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

  const anchorsList = freshAnchors
    .slice(0, 15)
    .map(a => `- [${a.type}] ${a.title}${a.releaseNote ? ` (${a.releaseNote})` : ''}`)
    .join('\n');

  const coldStartGuidance = dna.isColdStart
    ? `NOTE: The user has an empty or very small library (Cold Start). Present an extraordinary, multi-medium starter suite of seminal masterpieces and buzzworthy current releases across cinema, anime, TV, and literature to kickstart their cultural journey.`
    : '';

  const serendipityGuidance = serendipityMode === 'explore'
    ? `EXPLORATION MODE ACTIVE (Serendipity & Horizon Expansion):
Apply lateral thinking and adventurous discovery. Suggest provocative cult films, international cinema (South Korean, Japanese, Scandinavian, French), acclaimed indie literature, and bold, poetic works that share the deep thematic DNA of the user's tastes while breaking out of standard algorithmic echo chambers.`
    : `SAFE BET MODE ACTIVE (Consolidated Taste):
Focus primarily on high-certainty, 90%+ affinity recommendations: celebrated masterpieces, direct creator continuations, and universally praised works directly in line with their favorite titles and genres.`;

  return `Current Date: ${currentDate}

=== CURATION MODE ===
${serendipityGuidance}

=== USER CULTURAL PROFILE (DNA) ===
Total works registered: ${dna.totalItems}
Top formats: ${dna.topTypes.join(', ') || 'Eclectic (Open to all)'}
${dna.thematicKeywords && dna.thematicKeywords.length > 0 ? `Recurrent Thematic Interests: ${dna.thematicKeywords.join(', ')}` : ''}
${creatorList ? `Identified Favorite Creators / Authors / Studios: ${creatorList}` : ''}
${seedsList ? `Priority Anchor Works (Top Affinity): ${seedsList}` : ''}

Completed Works (High Affinity):
${completedList || 'None yet'}

Currently In Progress:
${inProgressList || 'None yet'}

Priority Goals:
${goalsList || 'None yet'}

${coldStartGuidance}

=== EXCLUSION LIST (DO NOT RECOMMEND ANY OF THESE) ===
Disliked by user:
${dislikedList || 'None'}

Already watched/read by user:
${ignoredList || 'None'}

=== REAL-TIME BROADCAST & SEASON ANCHORS (CURRENT & UPCOMING) ===
${anchorsList || 'None available currently'}

=== TASK ===
Analyze the user's cultural tastes and generate 3 to 4 thematic affinity clusters with 3 to 5 recommendations each.
Ensure rich variety and cross-medium bridges (mixing movies, series, anime, books, etc.).
Include creator lineage whenever applicable.
Mix tiers across clusters:
- "recent": Fresh releases up to current date ${currentDate}
- "classic": Timeless masterpieces
- "hidden_gem": Underrated gems
- "upcoming": Highly anticipated future releases and upcoming premieres (with "expected_release_date" such as "Novembro 2024", "2025" or "2026")

Every affinity reason must be in warm, natural Brazilian Portuguese (PT-BR).

Respond with ONLY a raw JSON object in this format:
{
  "clusters": [
    {
      "id": "slug-cluster-id",
      "title": "Nome do Cluster em Português",
      "description": "Breve síntese temática deste agrupamento",
      "items": [
        {
          "title": "Título Principal em PT ou Internacional",
          "original_title": "Título Original / Romanizado",
          "type": "filme" | "série" | "anime" | "manga" | "livro" | "hq" | "novel",
          "year": 2025,
          "tier": "recent" | "classic" | "hidden_gem" | "upcoming",
          "cluster": "Nome do Cluster",
          "creator": "Dir. Christopher Nolan" | "Estúdio MAPPA" | "Autor: Isaac Asimov",
          "affinity_reason": "Porque você assistiu X e aprecia a direção de Y...",
          "confidence_score": 0.95,
          "release_date": "YYYY-MM-DD",
          "expected_release_date": "Outubro 2025",
          "search_hint": "Title for IMDb/Jikan API search"
        }
      ]
    }
  ]
}`;
}
