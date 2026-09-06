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
import { appendToGroupInTr, createGroupInTr, safeNodeAt } from './groupCommands';
import type { GroupContentSource } from './groupCommands';
import { traceDrop } from './dropDiagnostics';
import { triggerToast } from '../../ui/ToastContext';
import { hideIndicator } from './groupDropIndicator';
import { pickSpecForPair } from './groupSpecs';
import { dragStates, dragStateFor, measureGrip } from './dragState';
import { cancelPendingEvaluate, scheduleEvaluate, computeDropTarget } from './dropEvaluation';
import type { GroupDropTarget } from './dropEvaluation';
import { contentToDrop, selectNodeForDrag as selectNodeForDragUtil } from './dragContent';

export type { GroupDropTarget };
export { extractNodesFromSlice } from './dragContent';

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

export function endExternalDrag(view: EditorView) {
  endDrag(view);
}

function armExternalDragCleanup(view: EditorView) {
  const onDragEnd = () => {
    endDrag(view);
    window.removeEventListener('dragend', onDragEnd);
    window.removeEventListener('drop', onDragEnd);
  };
  window.addEventListener('dragend', onDragEnd);
  window.addEventListener('drop', onDragEnd);
}

export function consumeGroupDropTarget(
  view: EditorView,
  point?: { x: number; y: number }
): GroupDropTarget | null {
  const fresh = point ? computeDropTarget(view, point.x, point.y, draggedSelection(view), draggable(view).dragging?.slice)?.target : null;
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

export function selectNodeForDrag(view: EditorView, pos: number, node: PMNode): boolean {
  return selectNodeForDragUtil(view, pos, node, (slice, nodeSel) => {
    draggable(view).dragging = { slice, move: true, node: nodeSel };
    armExternalDragCleanup(view);
  });
}

type DraggingState = { slice: Slice; move: boolean; node?: Selection | null };
type DraggingView = EditorView & { dragging: DraggingState | null };
const draggable = (view: EditorView) => view as DraggingView;

function draggedSelection(view: EditorView): Selection {
  return draggable(view).dragging?.node ?? view.state.selection;
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
              if (view.editable) scheduleEvaluate(view, event as DragEvent, draggedSelection(view), draggable(view).dragging?.slice);
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
            const target = computeDropTarget(view, event.clientX, event.clientY, draggedSelection(view), dragging?.slice)?.target ?? null;
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
