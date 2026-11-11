import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, type Selection } from '@tiptap/pm/state';

export interface DragState {
  target: any | null; // GroupDropTarget
  grip: number;
}

export const dragStates = new WeakMap<EditorView, DragState>();

export function dragStateFor(view: EditorView): DragState {
  let state = dragStates.get(view);
  if (!state) {
    state = { target: null, grip: 0 };
    dragStates.set(view, state);
  }
  return state;
}

export function measureGrip(view: EditorView, pos: number, pointerX?: number): number {
  if (typeof pointerX !== 'number' || !Number.isFinite(pointerX)) return 0;
  const dom = view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return 0;
  const rect = dom.getBoundingClientRect();
  if (rect.width === 0) return 0;
  return Math.max(0, Math.round(rect.left - pointerX));
}

export function findNodePos(doc: PMNode, node: PMNode): number | null {
  let found: number | null = null;
  doc.descendants((candidate, pos) => {
    if (found !== null) return false;
    if (candidate === node) {
      found = pos;
      return false;
    }
    return true;
  });
  return found;
}

export function isDraggingItself(_view: EditorView, draggedSelection: Selection, pos: number, node: PMNode): boolean {
  if (!(draggedSelection instanceof NodeSelection)) return false;
  return draggedSelection.from === pos || (draggedSelection.from >= pos && draggedSelection.to <= pos + node.nodeSize);
}
