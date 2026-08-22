import type { Page } from '../../../../types';
import type { QuestionItem, ReferencedBattery } from '../types';
import { normalizeQuizQuestions } from './quizNormalizer';

/**
 * Extrai baterias de exercícios a partir de um conteúdo HTML ou JSON de página.
 */
export function extractBatteriesFromContent(
  pageId: string,
  pageTitle: string,
  content?: string | any
): ReferencedBattery[] {
  if (!content) return [];

  const batteries: ReferencedBattery[] = [];

  // Caso 1: Conteúdo em JSON (TipTap Node Structure)
  if (typeof content === 'object') {
    const traverse = (node: any, indexRef: { count: number }) => {
      if (node?.type === 'questionBlock' && node.attrs) {
        const questions: QuestionItem[] = normalizeQuizQuestions(node.attrs.questions);
        const title = (node.attrs.title || 'Bateria de Exercícios').trim();
        batteries.push({
          id: `${pageId}_battery_${indexRef.count++}`,
          title: title || 'Bateria de Exercícios',
          pageId,
          pageTitle,
          questionCount: questions.length,
          questions,
        });
      }
      if (Array.isArray(node?.content)) {
        node.content.forEach((child: any) => traverse(child, indexRef));
      }
    };
    traverse(content, { count: 0 });
    return batteries;
  }

  // Caso 2: Se for string, verificar se é JSON TipTap serializado ou HTML
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"type":"questionBlock"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractBatteriesFromContent(pageId, pageTitle, parsed);
      } catch {
        // Fallback para parser DOM abaixo
      }
    }

    // Parser DOM para HTML
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
 * Busca todas as baterias de exercícios disponíveis em todas as páginas fornecidas.
 * Carrega o conteúdo assincronamente via API se a página não tiver conteúdo em memória.
 */
export async function findAllQuizBatteries(
  pages: Page[],
  currentBatteryTitle?: string
): Promise<ReferencedBattery[]> {
  const allBatteries: ReferencedBattery[] = [];

  for (const page of pages) {
    let content = page.content;

    // Se o conteúdo não estiver carregado em memória, busca via API
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
