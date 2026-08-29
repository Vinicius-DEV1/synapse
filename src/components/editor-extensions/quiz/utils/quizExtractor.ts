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
        const questions: QuestionItem[] = normalizeQuizQuestions(node.attrs.questions);
        const rawTitle = typeof node.attrs.title === 'string' ? node.attrs.title : 'Bateria de Exercícios';
        const title = rawTitle.trim();
        batteries.push({
          id: `${pageId}_battery_${indexRef.count++}`,
          title: title || 'Bateria de Exercícios',
          pageId,
          pageTitle,
          questionCount: questions.length,
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
        const title = el.getAttribute('data-title') || 'Bateria de Exercícios';
        const rawQuestions = el.getAttribute('data-questions');
        const questions = normalizeQuizQuestions(rawQuestions);

        batteries.push({
          id: `${pageId}_battery_${index}`,
          title: title.trim() || 'Bateria de Exercícios',
          pageId,
          pageTitle,
          questionCount: questions.length,
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
