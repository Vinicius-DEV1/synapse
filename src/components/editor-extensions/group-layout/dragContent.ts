import { Node as PMNode, Slice } from '@tiptap/pm/model';
import { NodeSelection, Selection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { safeNodeAt } from './groupCommands';

function unwrapLoneInlineAtom(node: PMNode): PMNode | null {
  if (!node.isTextblock || node.childCount !== 1) return null;
  const only = node.firstChild;
  if (!only || only.isText || !only.isAtom) return null;
  return only;
}

export function extractNodesFromSlice(slice: Slice | null | undefined): PMNode[] {
  if (!slice || slice.content.childCount === 0) return [];
  const nodes: PMNode[] = [];
  slice.content.forEach((node) => nodes.push(unwrapLoneInlineAtom(node) ?? node));
  return nodes;
}

export function contentToDrop(
  view: EditorView,
  dragged: Selection,
  moved: boolean,
  fallback: Slice | null | undefined
): PMNode[] {
  if (moved && dragged instanceof NodeSelection) {
    const live = safeNodeAt(view.state.doc, dragged.from);
    if (live && live.type === dragged.node.type) return [live];
  }
  return extractNodesFromSlice(fallback);
}

export function selectNodeForDrag(
  view: EditorView,
  pos: number,
  node: PMNode,
  draggableStateSetter: (slice: Slice, nodeSel: NodeSelection) => void
): boolean {
  const doc = view.state.doc;
  const at = safeNodeAt(doc, pos);
  
  let target: number | null = null;
  if (at === node || at?.eq(node)) {
    target = pos;
  } else {
    let found: number | null = null;
    doc.descendants((candidate, p) => {
      if (found !== null) return false;
      if (candidate === node) {
        found = p;
        return false;
      }
      return true;
    });
    target = found;
  }

  if (target === null) return false;

  try {
    const selection = NodeSelection.create(doc, target);
    view.dispatch(view.state.tr.setSelection(selection));
    draggableStateSetter(selection.content(), selection);
    return true;
  } catch {
    return false;
  }
}
