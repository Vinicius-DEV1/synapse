import type { BatteryWithQuestions, BatteryTreeNode, QuizQuestion } from '../../types/quiz';

/**
 * Builds a multi-level tree hierarchy of quiz batteries in O(N) time.
 * Calculates aggregated question counts and accuracy rates bottom-up.
 */
export function buildBatteryHierarchy(batteries: BatteryWithQuestions[]): BatteryTreeNode[] {
  if (!Array.isArray(batteries) || batteries.length === 0) {
    return [];
  }

  const map = new Map<string, BatteryTreeNode>();
  const roots: BatteryTreeNode[] = [];

  // Step 1: Initialize all tree nodes
  for (const b of batteries) {
    const answeredCount = b.questions.filter((q) => b.latestAttempts?.[q.id]).length;
    const correctCount = b.questions.filter((q) => b.latestAttempts?.[q.id]?.is_correct).length;

    map.set(b.id, {
      ...b,
      children: [],
      totalDescendantQuestionsCount: b.questions.length,
      totalDescendantAnsweredCount: answeredCount,
      totalDescendantCorrectCount: correctCount,
      aggregateAccuracyRate: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
    });
  }

  // Step 2: Link children to their parent nodes
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Step 3: Compute bottom-up aggregates recursively
  function computeAggregates(n: BatteryTreeNode): void {
    for (const child of n.children) {
      computeAggregates(child);
      n.totalDescendantQuestionsCount += child.totalDescendantQuestionsCount;
      n.totalDescendantAnsweredCount += child.totalDescendantAnsweredCount;
      n.totalDescendantCorrectCount += child.totalDescendantCorrectCount;
    }
    n.aggregateAccuracyRate =
      n.totalDescendantAnsweredCount > 0
        ? Math.round((n.totalDescendantCorrectCount / n.totalDescendantAnsweredCount) * 100)
        : 0;
  }

  roots.forEach(computeAggregates);

  const originalIndexMap = new Map<string, number>();
  batteries.forEach((b, idx) => originalIndexMap.set(b.id, idx));

  // Step 4: Sort roots and children (by sort_order if present, or original input order)
  function sortNodes(nodes: BatteryTreeNode[]): void {
    nodes.sort((a, b) => {
      if (a.sort_order !== undefined && b.sort_order !== undefined && a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return (originalIndexMap.get(a.id) ?? 0) - (originalIndexMap.get(b.id) ?? 0);
    });
    for (const n of nodes) {
      if (n.children.length > 0) {
        sortNodes(n.children);
      }
    }
  }

  sortNodes(roots);
  return roots;
}

/**
 * Retrieves all questions from a battery and all its recursive descendant sub-batteries.
 * Used for cumulative practice sessions on parent groups.
 */
export function getDescendantQuestions(
  batteryId: string,
  allBatteries: BatteryWithQuestions[]
): QuizQuestion[] {
  const batteryMap = new Map<string, BatteryWithQuestions>();
  for (const b of allBatteries) {
    batteryMap.set(b.id, b);
  }

  const target = batteryMap.get(batteryId);
  if (!target) return [];

  const questions: QuizQuestion[] = [...target.questions];

  // Find all direct and indirect children
  const childrenMap = new Map<string, BatteryWithQuestions[]>();
  for (const b of allBatteries) {
    if (b.parent_id) {
      const existing = childrenMap.get(b.parent_id) || [];
      existing.push(b);
      childrenMap.set(b.parent_id, existing);
    }
  }

  function collectFromChildren(parentId: string): void {
    const children = childrenMap.get(parentId) || [];
    for (const child of children) {
      questions.push(...child.questions);
      collectFromChildren(child.id);
    }
  }

  collectFromChildren(batteryId);
  return questions;
}

/**
 * Returns the breadcrumb ancestor chain from the root to the target battery.
 * Example: [{ id: '1', title: 'JAVASCRIPT' }, { id: '2', title: 'js-avançado' }]
 */
export function getBatteryBreadcrumb(
  batteryId: string,
  allBatteries: BatteryWithQuestions[]
): Array<{ id: string; title: string }> {
  const map = new Map<string, BatteryWithQuestions>();
  for (const b of allBatteries) {
    map.set(b.id, b);
  }

  const breadcrumb: Array<{ id: string; title: string }> = [];
  let currentId: string | null | undefined = batteryId;
  const visited = new Set<string>();

  while (currentId && map.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const item: BatteryWithQuestions = map.get(currentId)!;
    breadcrumb.unshift({ id: item.id, title: item.title });
    currentId = item.parent_id;
  }

  return breadcrumb;
}

/**
 * Returns a list of valid candidate parent batteries for selection dropdowns,
 * preventing cyclical references (cannot select self or any descendant as parent).
 */
export function getAvailableParentOptions(
  currentBatteryId: string | null | undefined,
  allBatteries: BatteryWithQuestions[]
): Array<{ id: string; title: string; depth: number }> {
  const descendants = new Set<string>();

  if (currentBatteryId) {
    descendants.add(currentBatteryId);
    const childrenMap = new Map<string, string[]>();
    for (const b of allBatteries) {
      if (b.parent_id) {
        const list = childrenMap.get(b.parent_id) || [];
        list.push(b.id);
        childrenMap.set(b.parent_id, list);
      }
    }

    function collectDescendants(id: string) {
      const kids = childrenMap.get(id) || [];
      for (const kid of kids) {
        if (!descendants.has(kid)) {
          descendants.add(kid);
          collectDescendants(kid);
        }
      }
    }

    collectDescendants(currentBatteryId);
  }

  // Build tree from candidate items only
  const validBatteries = allBatteries.filter((b) => !descendants.has(b.id));
  const tree = buildBatteryHierarchy(validBatteries);

  const result: Array<{ id: string; title: string; depth: number }> = [];

  function traverse(nodes: BatteryTreeNode[], depth: number) {
    for (const n of nodes) {
      result.push({ id: n.id, title: n.title, depth });
      if (n.children.length > 0) {
        traverse(n.children, depth + 1);
      }
    }
  }

  traverse(tree, 0);
  return result;
}

/**
 * Filters a battery hierarchy tree by a matching predicate.
 * If a child node matches, all its ancestors are preserved and marked for automatic expansion.
 */
export function filterBatteryHierarchy(
  nodes: BatteryTreeNode[],
  predicate: (b: BatteryWithQuestions) => boolean
): { filteredTree: BatteryTreeNode[]; autoExpandedIds: Set<string> } {
  const autoExpandedIds = new Set<string>();

  function filterNode(node: BatteryTreeNode): BatteryTreeNode | null {
    const matchesSelf = predicate(node);
    const matchingChildren: BatteryTreeNode[] = [];

    for (const child of node.children) {
      const filteredChild = filterNode(child);
      if (filteredChild) {
        matchingChildren.push(filteredChild);
      }
    }

    if (matchingChildren.length > 0) {
      // Child matched, so this parent must be visible and automatically expanded
      autoExpandedIds.add(node.id);
      return {
        ...node,
        children: matchingChildren,
      };
    }

    if (matchesSelf) {
      return {
        ...node,
        children: [],
      };
    }

    return null;
  }

  const filteredTree: BatteryTreeNode[] = [];
  for (const root of nodes) {
    const filteredRoot = filterNode(root);
    if (filteredRoot) {
      filteredTree.push(filteredRoot);
    }
  }

  return { filteredTree, autoExpandedIds };
}
