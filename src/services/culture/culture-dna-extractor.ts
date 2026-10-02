import type { CultureItem, CultureType } from '../../types';
import type { DislikedCultureItem, IgnoredCultureItem } from '../../types/culture-recommendations';

export interface UserCulturalDNA {
  totalItems: number;
  isColdStart: boolean;
  completedItems: Array<{ title: string; type: CultureType; year?: number | null }>;
  inProgressItems: Array<{ title: string; type: CultureType; progressPercent: number }>;
  goalItems: Array<{ title: string; type: CultureType }>;
  prioritySeeds: Array<{ title: string; type: CultureType; synopsis?: string }>;
  registeredWorks: Array<{ title: string; type: CultureType; synopsis?: string }>;
  thematicKeywords: string[];
  creatorSignatures: string[];
  typeDistribution: Partial<Record<CultureType, number>>;
  topTypes: CultureType[];
  dislikedTitles: Array<{ title: string; type: CultureType; reason?: string }>;
  ignoredTitles: Array<{ title: string; type: CultureType }>;
  allLibraryTitles: string[];
  libraryHash: string;
}

const THEMATIC_VOCABULARY = [
  // Sci-Fi & Speculative
  'ficção científica', 'sci-fi', 'cyberpunk', 'distopia', 'inteligência artificial',
  'viagem no tempo', 'multiverso', 'espaço', 'astronomia',
  // Mystery & Psychological
  'psicológico', 'suspense', 'investigação', 'mistério', 'detetive', 'crime', 'noir',
  // Fantasy & Adventure
  'fantasia', 'magia', 'alta fantasia', 'isekai', 'medieval', 'mitologia',
  // Horror & Thriller
  'terror', 'horror', 'sobrenatural', 'apocalipse', 'pós-apocalíptico', 'thriller',
  // Drama, Coming-of-Age & Romance
  'drama', 'filosofia', 'existencial', 'solidão', 'melancolia', 'romance',
  'coming of age', 'coming-of-age', 'amadurecimento', 'adolescência', 'adolescente', 'juvenil', 'jovem adulto', 'young adult',
  'comédia romântica', 'rom-com',
  // LGBTQIA+ / Queer Themes
  'lgbt', 'lgbtq', 'lgbtqia', 'queer', 'gay', 'gays', 'lésbica', 'trans', 'homossexual',
  'autodescoberta', 'orientação sexual', 'boys love', 'bl', 'yaoi', 'yuri', 'gl', 'romance lgbt',
  // Anime & Manga specific
  'shonen', 'seinen', 'shojo', 'josei', 'mecha', 'slice of life',
];

const NOTABLE_CREATORS = [
  'Denis Villeneuve', 'Christopher Nolan', 'Hayao Miyazaki', 'David Fincher',
  'Spike Jonze', 'Satoshi Kon', 'Makoto Shinkai', 'Stanley Kubrick',
  'Quentin Tarantino', 'Guillermo del Toro', 'Bong Joon-ho', 'Park Chan-wook',
  'Ridley Scott', 'Martin Scorsese', 'Wes Anderson', 'Hideaki Anno',
  'Mamoru Oshii', 'Shinichiro Watanabe', 'Alex Garland', 'David Lynch',
  'Studio Ghibli', 'MAPPA', 'Ufotable', 'Madhouse', 'Kyoto Animation',
  'Bones', 'Wit Studio', 'Trigger', 'Pixar', 'A24',
  'Becky Albertalli', 'Alice Oseman', 'Luca Guadagnino', 'Greg Berlanti',
  'Xavier Dolan', 'Pedro Almodóvar', 'Céline Sciamma', 'Gregg Araki',
  'Casey McQuiston', 'Adam Silvera',
  'Philip K. Dick', 'Isaac Asimov', 'Frank Herbert', 'Arthur C. Clarke',
  'George Orwell', 'William Gibson', 'Brandon Sanderson', 'Neil Gaiman',
  'Haruki Murakami', 'Ted Chiang', 'Junji Ito', 'Naoki Urasawa',
  'Kentaro Miura', 'Eiichiro Oda', 'Hajime Isayama', 'Tatsuki Fujimoto',
];

/**
 * Extracts recurrent thematic keywords from item synopses and titles.
 */
export function extractThematicKeywords(items: CultureItem[]): string[] {
  const frequencies = new Map<string, number>();

  for (const item of items) {
    const text = `${item.title || ''} ${item.synopsis || ''}`.toLowerCase();
    for (const token of THEMATIC_VOCABULARY) {
      if (text.includes(token)) {
        frequencies.set(token, (frequencies.get(token) || 0) + 1);
      }
    }
  }

  return Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([keyword]) => keyword);
}

/**
 * Extracts recognized directors, studios, and authors found in user library.
 */
export function extractCreatorSignatures(items: CultureItem[]): string[] {
  const recognized = new Set<string>();

  for (const item of items) {
    const fullText = `${item.title || ''} ${item.synopsis || ''} ${item.goal_note || ''}`.toLowerCase();
    for (const creator of NOTABLE_CREATORS) {
      if (fullText.includes(creator.toLowerCase())) {
        recognized.add(creator);
      }
    }
  }

  return Array.from(recognized).slice(0, 8);
}

/**
 * Generates a simple, robust deterministic hash for cache validation.
 */
export function generateLibraryHash(
  items: CultureItem[],
  disliked: DislikedCultureItem[],
  ignored: IgnoredCultureItem[]
): string {
  const itemKeys = items
    .map(i => `${i.id}:${i.title}:${i.progress}:${i.total_progress}`)
    .sort()
    .join('|');
  const dislikedKeys = disliked.map(d => `${d.id}:${d.title}`).sort().join('|');
  const ignoredKeys = ignored.map(ig => `${ig.id}:${ig.title}`).sort().join('|');
  const full = `${itemKeys}#${dislikedKeys}#${ignoredKeys}`;

  let hash = 0;
  for (let i = 0; i < full.length; i++) {
    hash = (hash << 5) - hash + full.charCodeAt(i);
    hash |= 0;
  }
  return `dna_${Math.abs(hash).toString(36)}_${items.length}_${disliked.length}`;
}

/**
 * Extracts comprehensive cultural profile and taste signature from the user's library.
 */
export function extractCulturalDNA(
  items: CultureItem[],
  disliked: DislikedCultureItem[] = [],
  ignored: IgnoredCultureItem[] = []
): UserCulturalDNA {
  const completedItems: Array<{ title: string; type: CultureType; year?: number | null; synopsis?: string }> = [];
  const inProgressItems: Array<{ title: string; type: CultureType; progressPercent: number }> = [];
  const goalItems: Array<{ title: string; type: CultureType; synopsis?: string }> = [];
  const registeredWorks: Array<{ title: string; type: CultureType; synopsis?: string }> = [];
  const typeDistribution: Partial<Record<CultureType, number>> = {};

  for (const item of items) {
    typeDistribution[item.type] = (typeDistribution[item.type] || 0) + 1;

    registeredWorks.push({
      title: item.title,
      type: item.type,
      synopsis: item.synopsis ? item.synopsis.slice(0, 150) : undefined,
    });

    const isCompleted = item.total_progress > 0 && item.progress >= item.total_progress;
    if (isCompleted) {
      completedItems.push({
        title: item.title,
        type: item.type,
        synopsis: item.synopsis ? item.synopsis.slice(0, 150) : undefined,
      });
    } else if (item.progress > 0 && item.total_progress > 0) {
      const progressPercent = Math.round((item.progress / item.total_progress) * 100);
      inProgressItems.push({
        title: item.title,
        type: item.type,
        progressPercent,
      });
    }

    if (item.is_goal) {
      goalItems.push({
        title: item.title,
        type: item.type,
        synopsis: item.synopsis ? item.synopsis.slice(0, 150) : undefined,
      });
    }
  }

  const topTypes = (Object.keys(typeDistribution) as CultureType[]).sort((a, b) => {
    return (typeDistribution[b] || 0) - (typeDistribution[a] || 0);
  });

  const explicitSeeds = [...completedItems, ...goalItems];
  const prioritySeeds = explicitSeeds.length > 0
    ? explicitSeeds.slice(0, 10)
    : registeredWorks.slice(0, 10);

  const thematicKeywords = extractThematicKeywords(items);
  const creatorSignatures = extractCreatorSignatures(items);
  const isColdStart = items.length === 0;

  const dislikedTitles = disliked.map(d => ({
    title: d.title,
    type: d.type,
    reason: d.reason,
  }));

  const ignoredTitles = ignored.map(ig => ({
    title: ig.title,
    type: ig.type,
  }));

  const allLibraryTitles = items.map(i => i.title?.trim()).filter(Boolean) as string[];
  const libraryHash = generateLibraryHash(items, disliked, ignored);

  return {
    totalItems: items.length,
    isColdStart,
    completedItems,
    inProgressItems,
    goalItems,
    prioritySeeds,
    registeredWorks,
    thematicKeywords,
    creatorSignatures,
    typeDistribution,
    topTypes,
    dislikedTitles,
    ignoredTitles,
    allLibraryTitles,
    libraryHash,
  };
}
