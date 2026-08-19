/**
 * Comandos e operações transacionais sobre grupos e colunas lado a lado.
 * Provê funções puras de manipulação de Transaction no ProseMirror e invólucros executáveis.
 */

import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { NodeSelection, Selection, TextSelection } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import type { GroupSpec } from './groupSpecs';
import { getSpecForGroup } from './groupSpecs';
import { triggerToast } from '../../ui/ToastContext';
import { readWidth, getWidths, rebalance, round1, normalizeWidths } from './groupWidths';

export { readWidth, getWidths, rebalance, round1, normalizeWidths };

export interface GroupRef {
  spec: GroupSpec;
  pos: number;
  node: PMNode;
}

/**
 * Retorna o nó em `pos` com validação de limites para evitar exceções caso o doc tenha mudado.
 */
export function safeNodeAt(doc: PMNode, pos: number): PMNode | null {
  if (!Number.isInteger(pos) || pos < 0 || pos >= doc.content.size) return null;
  return doc.nodeAt(pos);
}

/**
 * Localiza e resolve a especificação de um grupo na posição indicada.
 */
export function resolveGroup(view: EditorView, pos: number | null | undefined): GroupRef | null {
  if (typeof pos !== 'number') return null;
  const node = safeNodeAt(view.state.doc, pos);
  if (!node) return null;
  const spec = getSpecForGroup(node);
  return spec ? { spec, pos, node } : null;
}

export function getChildren(groupNode: PMNode): PMNode[] {
  const children: PMNode[] = [];
  groupNode.forEach((child) => children.push(child));
  return children;
}

/** Retorna a posição absoluta de cada filho dentro do documento. */
export function getChildPositions(groupPos: number, groupNode: PMNode): number[] {
  const positions: number[] = [];
  let offset = groupPos + 1;
  groupNode.forEach((child) => {
    positions.push(offset);
    offset += child.nodeSize;
  });
  return positions;
}

/** Retorna o conteúdo achatado de todos os filhos do grupo. */
export function flattenGroup(spec: GroupSpec, groupNode: PMNode): PMNode[] {
  return getChildren(groupNode).flatMap((child) => spec.childContent(child));
}

/**
 * Reescreve a faixa de um grupo com os filhos restantes, desfazendo o grupo se restar <= 1 filho.
 */
export function writeGroupRemainderInTr(
  tr: Transaction,
  spec: GroupSpec,
  groupNode: PMNode,
  range: { from: number; to: number },
  remaining: PMNode[],
  extra: PMNode[] = []
): void {
  if (remaining.length <= 1) {
    const content = [...remaining.flatMap((child) => spec.childContent(child)), ...extra];
    if (content.length === 0) tr.delete(range.from, range.to);
    else tr.replaceWith(range.from, range.to, Fragment.fromArray(content));
    return;
  }

  tr.replaceWith(
    range.from,
    range.to,
    groupNode.type.create(groupNode.attrs, rebalance(spec, remaining))
  );

  if (extra.length > 0) {
    tr.insert(tr.mapping.map(range.to, 1), Fragment.fromArray(extra));
  }
}

/** Define as larguras de todas as colunas de um grupo em uma única transação. */
export function setChildWidths(view: EditorView, groupPos: number, widths: number[]): boolean {
  try {
    const group = resolveGroup(view, groupPos);
    if (!group) return false;

    const { spec, node } = group;
    const tr = view.state.tr;
    const positions = getChildPositions(groupPos, node);

    getChildren(node).forEach((child, index) => {
      const next = widths[index];
      if (typeof next !== 'number' || !Number.isFinite(next)) return;
      if (round1(next) === round1(readWidth(spec, child))) return;
      tr.setNodeMarkup(positions[index], undefined, {
        ...child.attrs,
        [spec.widthAttr]: round1(next),
      });
    });

    if (!tr.docChanged) return false;
    view.dispatch(tr);
    return true;
  } catch (err) {
    console.error('[group-layout] Erro ao redimensionar colunas:', err);
    triggerToast('Não foi possível redimensionar a coluna.', 'error');
    return false;
  }
}

export function balanceChildren(view: EditorView, groupPos: number): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group || group.node.childCount === 0) return false;
  return setChildWidths(view, groupPos, new Array(group.node.childCount).fill(100 / group.node.childCount));
}

export type GroupContentSource = { from: number; to: number } | Selection | null | undefined;

function nodeRangeOf(source: GroupContentSource): { from: number; to: number } | null {
  if (source instanceof NodeSelection) return { from: source.from, to: source.to };
  if (source instanceof Selection) return null;
  return source && source.to > source.from ? source : null;
}

/**
 * Remove um filho de um grupo reescrevendo o grupo para manter o schema íntegro.
 */
export function removeGroupChildInTr(tr: Transaction, childPos: number): boolean {
  const found = findChildIndex(tr.doc, childPos);
  if (!found) return false;

  const group = safeNodeAt(tr.doc, found.groupPos);
  const spec = group ? getSpecForGroup(group) : null;
  if (!group || !spec) return false;

  const remaining = getChildren(group).filter((_, index) => index !== found.index);
  try {
    writeGroupRemainderInTr(tr, spec, group, {
      from: found.groupPos,
      to: found.groupPos + group.nodeSize,
    }, remaining);
  } catch (err) {
    console.warn('[group-layout] Erro ao reescrever grupo de origem:', err);
    return false;
  }
  return true;
}

function removeSource(tr: Transaction, source: GroupContentSource): number {
  const base = tr.steps.length;
  if (!source) return base;

  const range = nodeRangeOf(source);
  if (range && removeGroupChildInTr(tr, range.from)) return base;

  if (source instanceof Selection) source.replace(tr);
  else if (range) tr.delete(range.from, range.to);
  return base;
}

function selectGroupChildInTr(tr: Transaction, groupPos: number, index: number): void {
  try {
    const group = safeNodeAt(tr.doc, groupPos);
    if (!group || index < 0 || index >= group.childCount) return;

    const childPos = getChildPositions(groupPos, group)[index];
    const child = safeNodeAt(tr.doc, childPos);
    if (!child) return;

    tr.setSelection(
      child.isAtom && NodeSelection.isSelectable(child)
        ? NodeSelection.create(tr.doc, childPos)
        : TextSelection.near(tr.doc.resolve(childPos + 1))
    );
  } catch {
    // Falha silenciosa aceitável na redefinição de seleção opcional pós-drop
  }
}

/** Cria um grupo contendo o nó em `targetPos` e o conteúdo fornecido em `dropped`. */
export function createGroupInTr(
  tr: Transaction,
  spec: GroupSpec,
  targetPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const schema = tr.doc.type.schema;
  const groupType = schema.nodes[spec.groupName];
  if (!groupType) return false;

  const expected = safeNodeAt(tr.doc, targetPos);
  if (!expected) return false;

  const droppedChild = spec.wrapAsChild(schema, dropped, 50);
  const targetChild = spec.wrapAsChild(schema, [expected], 50);
  if (!droppedChild || !targetChild) return false;

  const initialStepsCount = tr.steps.length;

  const base = removeSource(tr, source);
  const pos = tr.mapping.slice(base).map(targetPos, -1);
  const target = safeNodeAt(tr.doc, pos);
  if (!target || target.type !== expected.type) {
    while (tr.steps.length > initialStepsCount) {
      tr.steps.pop();
    }
    return false;
  }

  const reloadedTargetChild = spec.wrapAsChild(schema, [target], 50);
  if (!reloadedTargetChild) {
    while (tr.steps.length > initialStepsCount) {
      tr.steps.pop();
    }
    return false;
  }

  try {
    const group = groupType.create(
      null,
      side === 'left' ? [droppedChild, reloadedTargetChild] : [reloadedTargetChild, droppedChild]
    );
    tr.replaceWith(pos, pos + target.nodeSize, group);
  } catch (err) {
    console.warn(`[group-layout] Erro ao criar ${spec.groupName}:`, err);
    while (tr.steps.length > initialStepsCount) {
      tr.steps.pop();
    }
    return false;
  }

  selectGroupChildInTr(tr, pos, side === 'left' ? 0 : 1);
  return tr.docChanged;
}

/** Adiciona uma coluna a um grupo existente redistribuindo as larguras. */
export function appendToGroupInTr(
  tr: Transaction,
  groupPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const initial = safeNodeAt(tr.doc, groupPos);
  const spec = initial ? getSpecForGroup(initial) : null;
  if (!spec || !initial) return false;

  if (initial.childCount >= spec.maxChildren) return false;
  const newChild = spec.wrapAsChild(tr.doc.type.schema, dropped, spec.defaultWidth);
  if (!newChild) return false;

  const initialStepsCount = tr.steps.length;

  const base = removeSource(tr, source);
  const pos = tr.mapping.slice(base).map(groupPos, -1);
  const group = safeNodeAt(tr.doc, pos);
  if (!group || group.type.name !== spec.groupName || group.childCount >= spec.maxChildren) {
    while (tr.steps.length > initialStepsCount) {
      tr.steps.pop();
    }
    return false;
  }

  const children = getChildren(group);
  const next = side === 'left' ? [newChild, ...children] : [...children, newChild];

  try {
    tr.replaceWith(pos, pos + group.nodeSize, group.type.create(group.attrs, rebalance(spec, next)));
  } catch (err) {
    console.warn(`[group-layout] Erro ao expandir ${spec.groupName}:`, err);
    while (tr.steps.length > initialStepsCount) {
      tr.steps.pop();
    }
    return false;
  }

  selectGroupChildInTr(tr, pos, side === 'left' ? 0 : next.length - 1);
  return tr.docChanged;
}

function dispatchIfChanged(view: EditorView, tr: Transaction, changed: boolean): boolean {
  if (!changed || !tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

export function createGroup(
  view: EditorView,
  spec: GroupSpec,
  targetPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const tr = view.state.tr;
  return dispatchIfChanged(view, tr, createGroupInTr(tr, spec, targetPos, dropped, side, source));
}

export function appendToGroup(
  view: EditorView,
  groupPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const tr = view.state.tr;
  return dispatchIfChanged(view, tr, appendToGroupInTr(tr, groupPos, dropped, side, source));
}

/**
 * Agrupa nós irmãos adjacentes (usado pelos botões de ação 'agrupar com o vizinho').
 * Prioridade: agrupar com o elemento de CIMA (anterior), que é o fluxo natural
 * de digitação/criação, e fallback para o elemento de BAIXO (posterior).
 */
export function groupWithSibling(view: EditorView, spec: GroupSpec, pos: number): boolean {
  const { state } = view;
  const node = state.doc.nodeAt(pos);
  if (!node) return false;

  if (findChildIndex(state.doc, pos)) return false;

  const range = { from: pos, to: pos + node.nodeSize };

  // 1ª Prioridade: Irmão de CIMA (anterior)
  const before = state.doc.resolve(pos).nodeBefore;
  if (before) {
    if (spec.acceptsContent([before])) {
      return createGroup(view, spec, pos - before.nodeSize, [node], 'right', range);
    }
    if (before.type.name === spec.groupName && before.childCount < spec.maxChildren) {
      return appendToGroup(view, pos - before.nodeSize, [node], 'right', range);
    }
  }

  // 2ª Prioridade (fallback): Irmão de BAIXO (posterior)
  const after = state.doc.resolve(range.to).nodeAfter;
  if (after) {
    if (spec.acceptsContent([after])) {
      return createGroup(view, spec, range.to, [node], 'left', range);
    }
    if (after.type.name === spec.groupName && after.childCount < spec.maxChildren) {
      return appendToGroup(view, range.to, [node], 'left', range);
    }
  }

  return false;
}

/** Desfaz o layout em colunas substituindo o grupo por seu conteúdo em fluxo vertical. */
export function unwrapGroup(view: EditorView, groupPos: number): boolean {
  try {
    const group = resolveGroup(view, groupPos);
    if (!group) return false;

    const content = flattenGroup(group.spec, group.node);
    const tr = view.state.tr;
    const end = groupPos + group.node.nodeSize;

    if (content.length === 0) tr.delete(groupPos, end);
    else tr.replaceWith(groupPos, end, Fragment.fromArray(content));

    return dispatchIfChanged(view, tr, true);
  } catch (err) {
    console.error('[group-layout] Falha ao desfazer agrupamento:', err);
    triggerToast('Não foi possível desfazer as colunas.', 'error');
    return false;
  }
}

/** Remove uma coluna específica do grupo, preservando opcionalmente seu conteúdo. */
export function removeChild(
  view: EditorView,
  groupPos: number,
  index: number,
  options: { keepContent?: boolean } = {}
): boolean {
  try {
    const group = resolveGroup(view, groupPos);
    if (!group) return false;

    const { spec, node } = group;
    const children = getChildren(node);
    if (index < 0 || index >= children.length) return false;

    const remaining = children.filter((_, i) => i !== index);
    const rescued = (options.keepContent ?? true) ? spec.childContent(children[index]) : [];

    const tr = view.state.tr;
    const range = { from: groupPos, to: groupPos + node.nodeSize };
    writeGroupRemainderInTr(tr, spec, node, range, remaining, rescued);

    return dispatchIfChanged(view, tr, true);
  } catch (err) {
    console.error('[group-layout] Falha ao remover coluna:', err);
    triggerToast('Não foi possível remover a coluna.', 'error');
    return false;
  }
}

/** Reordena uma coluna dentro do grupo mudando sua posição indexada. */
export function moveChild(view: EditorView, groupPos: number, from: number, to: number): boolean {
  try {
    const group = resolveGroup(view, groupPos);
    if (!group) return false;

    const children = getChildren(group.node);
    if (from === to) return false;
    if (from < 0 || from >= children.length || to < 0 || to >= children.length) return false;

    const reordered = children.slice();
    reordered.splice(to, 0, ...reordered.splice(from, 1));

    const tr = view.state.tr;
    tr.replaceWith(
      groupPos,
      groupPos + group.node.nodeSize,
      group.node.type.create(group.node.attrs, reordered)
    );

    return dispatchIfChanged(view, tr, true);
  } catch (err) {
    console.error('[group-layout] Erro ao reordenar coluna:', err);
    triggerToast('Não foi possível reordenar a coluna.', 'error');
    return false;
  }
}

/** Retorna a posição do grupo pai e o índice do filho a partir da posição absoluta do filho. */
export function findChildIndex(
  doc: PMNode,
  childPos: number
): { groupPos: number; index: number } | null {
  let $pos;
  try {
    $pos = doc.resolve(childPos);
  } catch {
    return null;
  }
  if ($pos.depth === 0) return null;
  if (!getSpecForGroup($pos.parent)) return null;

  return { groupPos: $pos.before($pos.depth), index: $pos.index($pos.depth) };
}

/**
 * Remove grupos degenerados (< 2 filhos) ou nós aninhados de forma inválida no documento.
 */
export function pruneGroupsInTransaction(tr: Transaction, _doc?: PMNode, spec?: GroupSpec): boolean {
  let changed = false;
  const targets: Array<{ pos: number; node: PMNode }> = [];

  tr.doc.descendants((node, pos) => {
    const nodeSpec = getSpecForGroup(node);
    if (!nodeSpec) return true;
    if (spec && nodeSpec !== spec) return false;
    targets.push({ pos, node });
    return true;
  });

  const contains = (outer: { pos: number; node: PMNode }, innerPos: number) =>
    innerPos > outer.pos && innerPos < outer.pos + outer.node.nodeSize;

  for (const target of targets.slice().reverse()) {
    const current = safeNodeAt(tr.doc, target.pos);
    if (!current) continue;
    const nodeSpec = getSpecForGroup(current);
    if (!nodeSpec) continue;

    const nested = targets.some((other) => other !== target && contains(other, target.pos));
    if (current.childCount >= 2 && !nested) continue;

    const from = target.pos;
    const to = from + current.nodeSize;
    const content = flattenGroup(nodeSpec, current);

    if (content.length === 0) tr.delete(from, to);
    else tr.replaceWith(from, to, Fragment.fromArray(content));
    changed = true;
  }

  return changed;
}
