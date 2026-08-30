import type { EditorView } from '@tiptap/pm/view';
import { type GroupSpec, getSpecForGroup, pickSpecForPair } from './groupSpecs';
import { topLevelBlockAt } from '../topLevelBlock';
import { isDraggingItself, dragStateFor } from './dragState';
import { extractNodesFromSlice } from './dragContent';
import { showIndicator, hideIndicator } from './groupDropIndicator';
import type { Selection } from '@tiptap/pm/state';

export interface GroupDropTarget {
  pos: number;
  side: 'left' | 'right';
  mode: 'create' | 'append';
  spec: GroupSpec;
  typeName: string;
}

const MIN_MOVE_PX = 3;
const MOVE_BAND_RATIO = 0.2;

let pendingFrame: number | null = null;
let lastEvaluated = { x: NaN, y: NaN };

export function cancelPendingEvaluate() {
  if (pendingFrame !== null) {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  }
  lastEvaluated = { x: NaN, y: NaN };
}

function verticalBand(view: EditorView, dom: HTMLElement, rect: DOMRect) {
  const editor = view.dom.getBoundingClientRect();
  const prev = dom.previousElementSibling?.getBoundingClientRect();
  const next = dom.nextElementSibling?.getBoundingClientRect();

  return {
    top: prev && prev.bottom <= rect.top ? (prev.bottom + rect.top) / 2 : Math.min(rect.top, editor.top),
    bottom: next && next.top >= rect.bottom ? (rect.bottom + next.top) / 2 : Math.max(rect.bottom, editor.bottom),
  };
}

function dropZoneFor(
  view: EditorView,
  dom: HTMLElement,
  rect: DOMRect,
  x: number,
  y: number,
  grip: number
): 'left' | 'right' | null {
  const band = verticalBand(view, dom, rect);
  if (y < band.top || y > band.bottom) return null;
  if (x < rect.left - grip || x > rect.right + grip) return null;

  const center = rect.left + rect.width / 2;
  if (Math.abs(x - center) <= (rect.width * MOVE_BAND_RATIO) / 2) return null;
  return x < center ? 'left' : 'right';
}

export function computeDropTarget(
  view: EditorView,
  x: number,
  y: number,
  draggedSelection: Selection,
  draggedSlice: any // Slice
): { target: GroupDropTarget; rect: DOMRect } | null {
  const block = topLevelBlockAt(view, x, y);
  if (!block) return null;

  const { pos, node, dom } = block;
  if (isDraggingItself(view, draggedSelection, pos, node)) return null;

  const rect = dom.getBoundingClientRect();
  if (rect.width === 0) return null;

  const side = dropZoneFor(view, dom, rect, x, y, dragStateFor(view).grip);
  if (!side) return null;

  const dragged = extractNodesFromSlice(draggedSlice);

  const groupSpec = getSpecForGroup(node);
  if (groupSpec) {
    const fits = node.childCount < groupSpec.maxChildren;
    const compatible = dragged.length === 0 || groupSpec.acceptsContent(dragged);
    if (!fits || !compatible) return null;

    return {
      target: { pos, side, mode: 'append', spec: groupSpec, typeName: node.type.name },
      rect,
    };
  }

  const spec = pickSpecForPair(dragged.length > 0 ? dragged : [node], node);
  if (!spec) return null;

  return { target: { pos, side, mode: 'create', spec, typeName: node.type.name }, rect };
}

export function evaluateDropTarget(view: EditorView, x: number, y: number, draggedSelection: Selection, draggedSlice: any) {
  const found = computeDropTarget(view, x, y, draggedSelection, draggedSlice);
  if (!found) {
    hideIndicator();
    const state = dragStateFor(view);
    if (state) state.target = null;
    return;
  }

  dragStateFor(view).target = found.target;
  showIndicator(found.rect, found.target.side);
}

export function scheduleEvaluate(view: EditorView, event: DragEvent, draggedSelection: Selection, draggedSlice: any) {
  const { clientX: x, clientY: y } = event;
  if (Math.abs(x - lastEvaluated.x) < MIN_MOVE_PX && Math.abs(y - lastEvaluated.y) < MIN_MOVE_PX) {
    return;
  }
  lastEvaluated = { x, y };

  if (pendingFrame !== null) return;
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = null;
    evaluateDropTarget(view, lastEvaluated.x, lastEvaluated.y, draggedSelection, draggedSlice);
  });
}
