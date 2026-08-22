/**
 * Utilities for atomic vertical movement of blocks and widgets in the editor.
 * Permite subir ou descer uma linha/bloco com 100% de estabilidade e feedback de toast.
 */

import type { EditorView } from '@tiptap/pm/view';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { getSpecForGroup } from './group-layout/groupSpecs';
import { pruneGroupsInTransaction, removeGroupChildInTr } from './group-layout/groupCommands';
import { triggerToast } from '../ui/ToastContext';

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
        tr.insert(prevChildPos, node);

        if (node.isAtom && NodeSelection.isSelectable(node)) {
          tr.setSelection(NodeSelection.create(tr.doc, prevChildPos));
        }
        view.dispatch(tr);
        view.focus();
        return true;
      } else {
        // If first child of a group, move OUTSIDE group (immediately before the group in doc)
        const groupPos = $pos.before($pos.depth);
        const groupNode = doc.nodeAt(groupPos);
        if (groupNode) {
          removeGroupChildInTr(tr, pos);
          tr.insert(groupPos, node);
          pruneGroupsInTransaction(tr);

          if (node.isAtom && NodeSelection.isSelectable(node)) {
            tr.setSelection(NodeSelection.create(tr.doc, groupPos));
          }
          view.dispatch(tr);
          view.focus();
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
    tr.insert(prevPos, node);

    if (node.isAtom && NodeSelection.isSelectable(node)) {
      tr.setSelection(NodeSelection.create(tr.doc, prevPos));
    } else {
      tr.setSelection(TextSelection.near(tr.doc.resolve(prevPos + 1)));
    }

    view.dispatch(tr);
    view.focus();
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
        tr.insert(insertPos, node);

        if (node.isAtom && NodeSelection.isSelectable(node)) {
          tr.setSelection(NodeSelection.create(tr.doc, insertPos));
        }
        view.dispatch(tr);
        view.focus();
        return true;
      } else {
        // If last child of a group, move OUTSIDE group (immediately after the group in doc)
        const groupPos = $pos.before($pos.depth);
        const groupNode = doc.nodeAt(groupPos);
        if (groupNode) {
          removeGroupChildInTr(tr, pos);
          const afterGroupPos = tr.mapping.map(groupPos + groupNode.nodeSize, 1);
          tr.insert(afterGroupPos, node);
          pruneGroupsInTransaction(tr);

          if (node.isAtom && NodeSelection.isSelectable(node)) {
            tr.setSelection(NodeSelection.create(tr.doc, afterGroupPos));
          }
          view.dispatch(tr);
          view.focus();
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
    tr.insert(insertPos, node);

    if (node.isAtom && NodeSelection.isSelectable(node)) {
      tr.setSelection(NodeSelection.create(tr.doc, insertPos));
    } else {
      tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
    }

    view.dispatch(tr);
    view.focus();
    return true;
  } catch (err) {
    console.error('[moveBlockDown] Erro ao descer bloco:', err);
    triggerToast('Não foi possível mover o bloco para baixo.', 'error');
    return false;
  }
}
