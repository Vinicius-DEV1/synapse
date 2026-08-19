import type { Page } from '../types';

/**
 * Verifica se `candidateChildId` é descendente de `parentId` na árvore de páginas.
 * Evita a criação de ciclos de dependência (ex.: A -> B -> A).
 */
export function isPageDescendant(
  pages: Array<Pick<Page, 'id' | 'parent_id'>>,
  parentId: string,
  candidateChildId: string
): boolean {
  if (!parentId || !candidateChildId) return false;
  if (parentId === candidateChildId) return true;

  const pageMap = new Map<string, Pick<Page, 'id' | 'parent_id'>>();
  for (const page of pages) {
    pageMap.set(page.id, page);
  }

  let currentId: string | null | undefined = candidateChildId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);

    const currentPage = pageMap.get(currentId);
    if (!currentPage || !currentPage.parent_id) {
      break;
    }

    if (currentPage.parent_id === parentId) {
      return true;
    }

    currentId = currentPage.parent_id;
  }

  return false;
}

/**
 * Valida se uma operação de mover página é permitida.
 * Retorna `false` se `sourceId` tentar ser filho de si mesmo ou de um de seus descendentes.
 */
export function isValidHierarchyMove(
  pages: Array<Pick<Page, 'id' | 'parent_id'>>,
  sourceId: string,
  targetParentId: string | null
): boolean {
  if (!sourceId) return false;
  if (targetParentId === null) return true;
  if (sourceId === targetParentId) return false;
  return !isPageDescendant(pages, sourceId, targetParentId);
}
