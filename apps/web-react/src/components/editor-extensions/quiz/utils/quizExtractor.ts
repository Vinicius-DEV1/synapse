import type { Page } from '../../../../types';
import type { QuestionItem, ReferencedBattery } from '../types';
import { normalizeQuizQuestions } from './quizNormalizer';

interface TipTapNodeLike {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNodeLike[];
  [key: string]: unknown;
}

/**
 * Extracts quiz batteries from page HTML or JSON content.
 */
export function extractBatteriesFromContent(
  pageId: string,
  pageTitle: string,
  content?: string | TipTapNodeLike | Record<string, unknown>
): ReferencedBattery[] {
  if (!content) return [];

  const batteries: ReferencedBattery[] = [];

  // Case 1: JSON TipTap Node Structure
  if (typeof content === 'object') {
    const traverse = (node: TipTapNodeLike | null | undefined, indexRef: { count: number }) => {
      if (!node) return;
      if (node.type === 'questionBlock' && node.attrs) {
        const rawTitle =
          (typeof node.attrs.cachedTitle === 'string' && node.attrs.cachedTitle.trim()) ||
          (typeof node.attrs.title === 'string' && node.attrs.title.trim()) ||
          'Bateria de Exercícios';

        const hasLegacyQuestions = Array.isArray(node.attrs.questions) && node.attrs.questions.length > 0;
        const questions: QuestionItem[] = hasLegacyQuestions
          ? normalizeQuizQuestions(node.attrs.questions)
          : [];

        const cachedCount = typeof node.attrs.cachedCount === 'number' ? node.attrs.cachedCount : 0;
        const questionCount = cachedCount > 0 ? cachedCount : questions.length;
        const batteryId = typeof node.attrs.batteryId === 'string' && node.attrs.batteryId ? node.attrs.batteryId : null;

        batteries.push({
          id: batteryId || `${pageId}_battery_${indexRef.count++}`,
          title: rawTitle,
          pageId,
          pageTitle,
          questionCount,
          questions,
        });
      }
      if (Array.isArray(node.content)) {
        node.content.forEach((child) => traverse(child, indexRef));
      }
    };
    traverse(content as TipTapNodeLike, { count: 0 });
    return batteries;
  }

  // Case 2: String payload (serialized TipTap JSON or HTML)
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"type":"questionBlock"')) {
      try {
        const parsed = JSON.parse(trimmed) as TipTapNodeLike;
        return extractBatteriesFromContent(pageId, pageTitle, parsed);
      } catch {
        // Fallback to DOM parser below
      }
    }

    // DOM parser for HTML content
    try {
      const container = document.createElement('div');
      container.innerHTML = content;
      const elements = container.querySelectorAll('div[data-type="question-block"], div.question-block');

      elements.forEach((el, index) => {
        const cachedTitle = el.getAttribute('data-cached-title');
        const legacyTitle = el.getAttribute('data-title');
        const title = (cachedTitle || legacyTitle || 'Bateria de Exercícios').trim();

        const rawCount = el.getAttribute('data-cached-count');
        const cachedCount = rawCount ? parseInt(rawCount, 10) : 0;

        const rawQuestions = el.getAttribute('data-questions');
        const questions = rawQuestions ? normalizeQuizQuestions(rawQuestions) : [];

        const questionCount = cachedCount > 0 ? cachedCount : questions.length;
        const batteryId = el.getAttribute('data-battery-id');

        batteries.push({
          id: batteryId || `${pageId}_battery_${index}`,
          title: title || 'Bateria de Exercícios',
          pageId,
          pageTitle,
          questionCount,
          questions,
        });
      });
    } catch (err) {
      console.warn('Erro ao extrair baterias de exercícios do HTML:', err);
    }
  }

  return batteries;
}

/**
 * Retrieves all available quiz batteries across all supplied pages.
 * Asynchronously loads page content via API if not loaded in memory.
 */
export async function findAllQuizBatteries(
  pages: Page[],
  currentBatteryTitle?: string
): Promise<ReferencedBattery[]> {
  const allBatteries: ReferencedBattery[] = [];

  for (const page of pages) {
    let content = page.content;

    // Fetch via API if page content is not yet resident in memory
    if (!content && window.api?.getPageContent) {
      try {
        const fullData = await window.api.getPageContent(page.id);
        content = fullData?.content;
      } catch (err) {
        console.warn(`Não foi possível carregar conteúdo da página ${page.id}:`, err);
      }
    }

    if (content) {
      const pageBatteries = extractBatteriesFromContent(page.id, page.title || 'Sem título', content);
      allBatteries.push(...pageBatteries);
    }
  }

  if (currentBatteryTitle) {
    return allBatteries.filter((b) => b.title !== currentBatteryTitle);
  }

  return allBatteries;
}
