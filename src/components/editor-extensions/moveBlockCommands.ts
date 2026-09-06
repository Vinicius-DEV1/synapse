/**
 * Utilities for atomic vertical movement of blocks and widgets in the editor.
 * Permite subir ou descer uma linha/bloco com 100% de estabilidade e feedback de toast.
 */

import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { getSpecForGroup } from './group-layout/groupSpecs';
import { pruneGroupsInTransaction, removeGroupChildInTr } from './group-layout/groupCommands';
import { triggerToast } from '../ui/ToastContext';

const IMAGE_NODE_NAMES = new Set(['image', 'resizableImage', 'encryptedImage']);

function shouldSelectAsNode(node: PMNode): boolean {
  if (!NodeSelection.isSelectable(node)) return false;
  return node.isAtom || node.isLeaf || node.type.spec.atom === true || IMAGE_NODE_NAMES.has(node.type.name);
}

function cloneNodeForMove(node: PMNode): PMNode {
  return node.type.create(node.attrs, node.content, node.marks);
}

function safeSetSelection(tr: any, node: PMNode, targetPos: number) {
  if (shouldSelectAsNode(node)) {
    try {
      tr.setSelection(NodeSelection.create(tr.doc, targetPos));
      return;
    } catch {
      /* Fallback to text selection below */
    }
  }
  try {
    tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(targetPos + 1, tr.doc.content.size))));
  } catch {
    /* Continue without explicit selection if boundary is invalid */
  }
}

/**
 * Moves the block or widget at `pos` upwards (swapping with previous sibling node).
 */
export function moveBlockUp(view: EditorView, pos: number): boolean {
  try {
    const doc = view.state.doc;
    if (pos < 0 || pos >= doc.content.size) return false;

    const $pos = doc.resolve(pos);
    const node = doc.nodeAt(pos);
    if (!node) return false;

    const tr = view.state.tr;
    const parent = $pos.parent;
    const groupSpec = $pos.depth > 0 ? getSpecForGroup(parent) : null;

    // 1. Bloco dentro de um grupo (linkGroup ou columnBlock)
    if (groupSpec) {
      const index = $pos.index();
      if (index > 0) {
        // Swap with previous sibling within same group
        const prevChild = parent.child(index - 1);
        const prevChildPos = pos - prevChild.nodeSize;
        tr.delete(pos, pos + node.nodeSize);
        const cloned = cloneNodeForMove(node);
        tr.insert(prevChildPos, cloned);

        safeSetSelection(tr, cloned, prevChildPos);
        view.dispatch(tr.scrollIntoView());
        if (typeof view.focus === 'function') view.focus();
        return true;
      } else {
        // If first child of a group, move OUTSIDE group (immediately before the group in doc)
        const groupPos = $pos.before($pos.depth);
        const groupNode = doc.nodeAt(groupPos);
        if (groupNode) {
          removeGroupChildInTr(tr, pos);
          const cloned = cloneNodeForMove(node);
          tr.insert(groupPos, cloned);
          pruneGroupsInTransaction(tr);

          safeSetSelection(tr, cloned, groupPos);
          view.dispatch(tr.scrollIntoView());
          if (typeof view.focus === 'function') view.focus();
          return true;
        }
      }
    }

    // 2. Top-level block (depth 0 in doc)
    const index = $pos.index(0);
    if (index === 0) {
      triggerToast('O bloco já está na primeira posição.', 'info', 2000);
      return false;
    }

    // Calculate position of previous top-level block
    let prevPos = 0;
    for (let i = 0; i < index - 1; i++) {
      prevPos += doc.child(i).nodeSize;
    }

    tr.delete(pos, pos + node.nodeSize);
    const cloned = cloneNodeForMove(node);
    tr.insert(prevPos, cloned);

    safeSetSelection(tr, cloned, prevPos);

    view.dispatch(tr.scrollIntoView());
    if (typeof view.focus === 'function') view.focus();
    return true;
  } catch (err) {
    console.error('[moveBlockUp] Erro ao subir bloco:', err);
    triggerToast('Não foi possível mover o bloco para cima.', 'error');
    return false;
  }
}

/**
 * Moves the block or widget at `pos` downwards (swapping with next sibling node).
 */
export function moveBlockDown(view: EditorView, pos: number): boolean {
  try {
    const doc = view.state.doc;
    if (pos < 0 || pos >= doc.content.size) return false;

    const $pos = doc.resolve(pos);
    const node = doc.nodeAt(pos);
    if (!node) return false;

    const tr = view.state.tr;
    const parent = $pos.parent;
    const groupSpec = $pos.depth > 0 ? getSpecForGroup(parent) : null;

    // 1. Bloco dentro de um grupo (linkGroup ou columnBlock)
    if (groupSpec) {
      const index = $pos.index();
      if (index < parent.childCount - 1) {
        // Swap with next sibling within same group
        const nextChild = parent.child(index + 1);
        const insertPos = pos + nextChild.nodeSize;
        tr.delete(pos, pos + node.nodeSize);
        const cloned = cloneNodeForMove(node);
        tr.insert(insertPos, cloned);

        safeSetSelection(tr, cloned, insertPos);
        view.dispatch(tr.scrollIntoView());
        if (typeof view.focus === 'function') view.focus();
        return true;
      } else {
        // If last child of a group, move OUTSIDE group (immediately after the group in doc)
        const groupPos = $pos.before($pos.depth);
        const groupNode = doc.nodeAt(groupPos);
        if (groupNode) {
          removeGroupChildInTr(tr, pos);
          const afterGroupPos = tr.mapping.map(groupPos + groupNode.nodeSize, 1);
          const cloned = cloneNodeForMove(node);
          tr.insert(afterGroupPos, cloned);
          pruneGroupsInTransaction(tr);

          safeSetSelection(tr, cloned, afterGroupPos);
          view.dispatch(tr.scrollIntoView());
          if (typeof view.focus === 'function') view.focus();
          return true;
        }
      }
    }

    // 2. Top-level block (depth 0 in doc)
    const index = $pos.index(0);
    if (index >= doc.childCount - 1) {
      triggerToast('O bloco já está na última posição.', 'info', 2000);
      return false;
    }

    const nextNode = doc.child(index + 1);
    const insertPos = pos + nextNode.nodeSize;

    tr.delete(pos, pos + node.nodeSize);
    const cloned = cloneNodeForMove(node);
    tr.insert(insertPos, cloned);

    safeSetSelection(tr, cloned, insertPos);

    view.dispatch(tr.scrollIntoView());
    if (typeof view.focus === 'function') view.focus();
    return true;
  } catch (err) {
    console.error('[moveBlockDown] Erro ao descer bloco:', err);
    triggerToast('Não foi possível mover o bloco para baixo.', 'error');
    return false;
  }
}
