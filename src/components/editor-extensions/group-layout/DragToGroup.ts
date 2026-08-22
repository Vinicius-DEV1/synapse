/**
 * DragToGroup Extension
 *
 * Gerencia o agrupamento de blocos lado a lado via drag and drop.
 * Enables group creation (such as columnGroup or linkGroup) when dropping a block onto
 * side drop zones of another block, or integrate into an existing group.
 */

import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { Selection, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode, Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { getSpecForGroup, pickSpecForPair } from './groupSpecs';
import type { GroupSpec } from './groupSpecs';
import { appendToGroupInTr, createGroupInTr, safeNodeAt } from './groupCommands';
import type { GroupContentSource } from './groupCommands';
import { topLevelBlockAt } from '../topLevelBlock';
import { traceDrop } from './dropDiagnostics';
import { triggerToast } from '../../ui/ToastContext';
import { showIndicator, hideIndicator } from './groupDropIndicator';

export interface GroupDropTarget {
  pos: number;
  side: 'left' | 'right';
  mode: 'create' | 'append';
  spec: GroupSpec;
  typeName: string;
}

type DraggingState = { slice: Slice; move: boolean; node?: Selection | null };
type DraggingView = EditorView & { dragging: DraggingState | null };
const draggable = (view: EditorView) => view as DraggingView;

/**
 * Returns representative selection of dragged node (node selection or active selection).
 */
function draggedSelection(view: EditorView): Selection {
  return draggable(view).dragging?.node ?? view.state.selection;
}

interface DragState {
  target: GroupDropTarget | null;
  grip: number;
}

const dragStates = new WeakMap<EditorView, DragState>();

function dragStateFor(view: EditorView): DragState {
  let state = dragStates.get(view);
  if (!state) {
    state = { target: null, grip: 0 };
    dragStates.set(view, state);
  }
  return state;
}

/** Minimum distance in pixels to recalculate drop zone on dragover. */
const MIN_MOVE_PX = 3;

/** Central threshold ratio dedicated to standard reordering (non-grouping). */
const MOVE_BAND_RATIO = 0.2;

function clearTarget(view: EditorView) {
  hideIndicator();
  const state = dragStates.get(view);
  if (state) state.target = null;
}

function clearGrip(view: EditorView) {
  const state = dragStates.get(view);
  if (state) state.grip = 0;
}

function endDrag(view: EditorView) {
  cancelPendingEvaluate();
  clearTarget(view);
  clearGrip(view);
}

/**
 * Returns and clears active grouping target (used for external file/image drops).
 */
export function consumeGroupDropTarget(
  view: EditorView,
  point?: { x: number; y: number }
): GroupDropTarget | null {
  const fresh = point ? computeDropTarget(view, point.x, point.y)?.target : null;
  const target = fresh ?? dragStates.get(view)?.target ?? null;
  endDrag(view);
  return target;
}

/**
 * Initiates drag protocol for blocks triggered outside view.dom (e.g. floating handle).
 */
export function startExternalBlockDrag(
  view: EditorView,
  pos: number,
  pointerX?: number
): boolean {
  const node = view.state.doc.nodeAt(pos);
  if (!node) return false;

  let selection: NodeSelection;
  try {
    selection = NodeSelection.create(view.state.doc, pos);
  } catch {
    return false;
  }

  view.dispatch(view.state.tr.setSelection(selection));
  draggable(view).dragging = { slice: selection.content(), move: true, node: selection };
  dragStateFor(view).grip = measureGrip(view, pos, pointerX);
  armExternalDragCleanup(view);
  return true;
}

function measureGrip(view: EditorView, pos: number, pointerX?: number): number {
  if (typeof pointerX !== 'number' || !Number.isFinite(pointerX)) return 0;
  const dom = view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return 0;
  const rect = dom.getBoundingClientRect();
  if (rect.width === 0) return 0;
  return Math.max(0, Math.round(rect.left - pointerX));
}

/**
 * Selects a node for drag, verifying position matches node instance.
 */
export function selectNodeForDrag(view: EditorView, pos: number, node: PMNode): boolean {
  const doc = view.state.doc;
  const at = safeNodeAt(doc, pos);
  const target = at === node || at?.eq(node) ? pos : findNodePos(doc, node);
  if (target === null) return false;

  try {
    const selection = NodeSelection.create(doc, target);
    view.dispatch(view.state.tr.setSelection(selection));
    draggable(view).dragging = { slice: selection.content(), move: true, node: selection };
    return true;
  } catch {
    return false;
  }
}

function findNodePos(doc: PMNode, node: PMNode): number | null {
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

export function endExternalDrag(view: EditorView) {
  disarmExternalCleanup?.();
  draggable(view).dragging = null;
  endDrag(view);
}

let disarmExternalCleanup: (() => void) | null = null;

function armExternalDragCleanup(view: EditorView) {
  disarmExternalCleanup?.();
  if (typeof window === 'undefined') return;

  const finish = () => {
    // Macrotask ensuring ProseMirror completes internal drop transaction
    // and delete source node before clearing view.dragging.
    setTimeout(() => {
      endExternalDrag(view);
    }, 0);
  };

  window.addEventListener('dragend', finish, { once: true });

  disarmExternalCleanup = () => {
    window.removeEventListener('dragend', finish);
    disarmExternalCleanup = null;
  };
}

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

function contentToDrop(
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

function isDraggingItself(view: EditorView, pos: number, node: PMNode): boolean {
  const selection = draggedSelection(view);
  if (!(selection instanceof NodeSelection)) return false;
  return selection.from === pos || (selection.from >= pos && selection.to <= pos + node.nodeSize);
}

let pendingFrame: number | null = null;
let lastEvaluated = { x: NaN, y: NaN };

function cancelPendingEvaluate() {
  if (pendingFrame !== null) {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  }
  lastEvaluated = { x: NaN, y: NaN };
}

function scheduleEvaluate(view: EditorView, event: DragEvent) {
  const { clientX: x, clientY: y } = event;
  if (Math.abs(x - lastEvaluated.x) < MIN_MOVE_PX && Math.abs(y - lastEvaluated.y) < MIN_MOVE_PX) {
    return;
  }
  lastEvaluated = { x, y };

  if (pendingFrame !== null) return;
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = null;
    evaluateDropTarget(view, lastEvaluated.x, lastEvaluated.y);
  });
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

function computeDropTarget(
  view: EditorView,
  x: number,
  y: number
): { target: GroupDropTarget; rect: DOMRect } | null {
  const block = topLevelBlockAt(view, x, y);
  if (!block) return null;

  const { pos, node, dom } = block;
  if (isDraggingItself(view, pos, node)) return null;

  const rect = dom.getBoundingClientRect();
  if (rect.width === 0) return null;

  const side = dropZoneFor(view, dom, rect, x, y, dragStateFor(view).grip);
  if (!side) return null;

  const dragged = extractNodesFromSlice(draggable(view).dragging?.slice);

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

function evaluateDropTarget(view: EditorView, x: number, y: number) {
  const found = computeDropTarget(view, x, y);
  if (!found) return clearTarget(view);

  dragStateFor(view).target = found.target;
  showIndicator(found.rect, found.target.side);
}

export function applyGroupDropInTr(
  tr: Transaction,
  target: GroupDropTarget,
  content: PMNode[],
  source: GroupContentSource
): boolean {
  const current = safeNodeAt(tr.doc, target.pos);
  if (!current || current.type.name !== target.typeName) return false;

  if (target.spec.acceptsContent(content)) {
    return target.mode === 'append'
      ? appendToGroupInTr(tr, target.pos, content, target.side, source)
      : createGroupInTr(tr, target.spec, target.pos, content, target.side, source);
  }

  if (target.mode === 'append') return false;
  const fallback = pickSpecForPair(content, current);
  if (!fallback) return false;
  return createGroupInTr(tr, fallback, target.pos, content, target.side, source);
}

export function applyGroupDrop(
  view: EditorView,
  target: GroupDropTarget,
  content: PMNode[],
  source?: GroupContentSource
): boolean {
  try {
    const tr = view.state.tr;
    if (!applyGroupDropInTr(tr, target, content, source) || !tr.docChanged) return false;
    view.dispatch(tr.scrollIntoView());
    return true;
  } catch (err) {
    console.error('[group-layout] Erro inesperado ao soltar no grupo:', err);
    triggerToast('Não foi possível agrupar os blocos.', 'error');
    return false;
  }
}

export const DragToGroup = Extension.create({
  name: 'dragToGroup',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragToGroup'),

        props: {
          handleDOMEvents: {
            dragend: (view) => {
              endDrag(view);
              return false;
            },

            dragover: (view, event) => {
              if (view.editable) scheduleEvaluate(view, event as DragEvent);
              return false;
            },

            dragleave: (view, event) => {
              const related = (event as DragEvent).relatedTarget as Node | null;
              if (!related || !view.dom.contains(related)) {
                cancelPendingEvaluate();
                clearTarget(view);
              }
              return false;
            },

            drop: () => {
              cancelPendingEvaluate();
              hideIndicator();
              return false;
            },
          },

          handleDrop(view, event, slice, moved) {
            const dragging = draggable(view).dragging;
            const target = computeDropTarget(view, event.clientX, event.clientY)?.target ?? null;
            endDrag(view);
            if (!target) return false;

            const dragged = draggedSelection(view);
            const source: GroupContentSource = moved ? dragged : null;

            if (moved && dragged.from <= target.pos && dragged.to >= target.pos) return false;

            if (moved && dragged instanceof NodeSelection) {
              const atOrigin = safeNodeAt(view.state.doc, dragged.from);
              if (!atOrigin || atOrigin.type !== dragged.node.type) return false;
            }

            const content = contentToDrop(view, dragged, moved, dragging?.slice ?? slice);
            if (content.length === 0) return false;

            const trace = traceDrop(view, {
              origem: !dragging
                ? 'sem dragging (externo)'
                : dragging.node
                  ? 'dragging.node'
                  : 'seleção do documento',
              moved,
              selecaoUsada: dragged,
              alvo: {
                pos: target.pos,
                typeName: target.typeName,
                mode: target.mode,
                side: target.side,
              },
              conteudo: content,
            });

            const aplicado = applyGroupDrop(view, target, content, source);
            trace(aplicado);
            return aplicado;
          },
        },
      }),
    ];
  },
});
