/**
 * Comandos e operações de alto nível sobre grupos e colunas lado a lado no EditorView.
 */

import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import type { Transaction } from '@tiptap/pm/state';
import type { GroupSpec } from './groupSpecs';
import { triggerToast } from '../../ui/ToastContext';
import { readWidth, getWidths, rebalance, round1, normalizeWidths } from './groupWidths';
import {
  type GroupRef,
  type GroupContentSource,
  safeNodeAt,
  resolveGroup,
  getChildren,
  getChildPositions,
  flattenGroup,
  writeGroupRemainderInTr,
  removeGroupChildInTr,
  createGroupInTr,
  appendToGroupInTr,
  findChildIndex,
  pruneGroupsInTransaction,
} from './groupTransactionOps';

export {
  readWidth,
  getWidths,
  rebalance,
  round1,
  normalizeWidths,
  type GroupRef,
  type GroupContentSource,
  safeNodeAt,
  resolveGroup,
  getChildren,
  getChildPositions,
  flattenGroup,
  writeGroupRemainderInTr,
  removeGroupChildInTr,
  createGroupInTr,
  appendToGroupInTr,
  findChildIndex,
  pruneGroupsInTransaction,
};

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
