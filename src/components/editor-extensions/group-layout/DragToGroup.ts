/**
 * DragToGroup.ts
 *
 * Arrastar um bloco para a borda esquerda/direita de outro cria um layout lado
 * a lado. O tipo de grupo é escolhido pelo conteúdo: dois cards de link viram
 * um `linkGroup`; qualquer outra combinação vira um `columnGroup`.
 *
 * ─── Histórico dos bugs corrigidos aqui ──────────────────────────────────────
 * A versão original nunca funcionou: dois plugins separados, o primeiro tratava
 * o evento DOM `drop` e zerava o alvo, o segundo lia esse alvo em `handleDrop`.
 * Como o ProseMirror executa `handleDOMEvents.drop` ANTES de `handleDrop`, o
 * alvo já era nulo e nenhuma coluna era criada.
 *
 * Também corrigidos: indicador `absolute` posicionado com coordenadas de
 * viewport (errava o lugar com a página rolada), `dragleave` disparando entre
 * elementos filhos (piscava sem parar), soltar um bloco sobre ele mesmo, e uso
 * do tamanho antigo do node depois de uma exclusão.
 */

import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PMNode, Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { getSpecForGroup, pickSpecForPair } from './groupSpecs';
import type { GroupSpec } from './groupSpecs';
import { appendToGroup, createGroup } from './groupCommands';

export interface GroupDropTarget {
  pos: number;
  side: 'left' | 'right';
  /** `create`: envolve o bloco alvo num grupo novo. `append`: soma uma coluna a um grupo existente. */
  mode: 'create' | 'append';
  spec: GroupSpec;
}

const EDGE_RATIO = 0.22;
const EDGE_MAX_PX = 140;
const EDGE_MIN_PX = 28;

// Estado do arrasto em curso. Module-level de propósito: o Editor.tsx precisa
// consultá-lo no próprio `handleDrop`, que roda antes do dos plugins.
let activeTarget: GroupDropTarget | null = null;
let indicator: HTMLDivElement | null = null;
let draggedOrigin: { pos: number; node: PMNode; nodeSize: number } | null = null;

function hideIndicator() {
  indicator?.remove();
  indicator = null;
}

function clearDragState() {
  hideIndicator();
  activeTarget = null;
  draggedOrigin = null;
}

function showIndicator(rect: DOMRect, side: 'left' | 'right') {
  if (!indicator) {
    indicator = document.createElement('div');
    // `fixed` porque o rect vem em coordenadas de viewport — com `absolute` o
    // indicador ficava deslocado pelo valor do scroll.
    indicator.style.position = 'fixed';
    indicator.style.width = '4px';
    indicator.style.borderRadius = '2px';
    indicator.style.background = '#8b5cf6';
    indicator.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.85)';
    indicator.style.zIndex = '9999';
    indicator.style.pointerEvents = 'none';
    document.body.appendChild(indicator);
  }
  indicator.style.left = `${side === 'left' ? rect.left - 6 : rect.right + 2}px`;
  indicator.style.top = `${rect.top}px`;
  indicator.style.height = `${Math.max(rect.height, 24)}px`;
}

/**
 * Devolve (e limpa) o alvo do arrasto atual.
 * Usado pelo Editor.tsx ao soltar ARQUIVOS, já que `editorProps.handleDrop`
 * roda antes do `handleDrop` dos plugins.
 */
export function consumeGroupDropTarget(): GroupDropTarget | null {
  const target = activeTarget;
  clearDragState();
  return target;
}

/** Aplica um alvo já consumido — o Editor.tsx usa isso para imagens soltas. */
export function applyGroupDrop(
  view: EditorView,
  target: GroupDropTarget,
  content: PMNode[],
  removeRange?: { from: number; to: number } | null
): boolean {
  if (!target.spec.acceptsContent(content)) {
    // Ex.: arrastar uma imagem para a borda de um grupo de links.
    if (target.mode === 'append') return false;
    const fallback = pickSpecForPair(content, view.state.doc.nodeAt(target.pos)!);
    if (!fallback) return false;
    return createGroup(view, fallback, target.pos, content, target.side, removeRange);
  }

  return target.mode === 'append'
    ? appendToGroup(view, target.pos, content, target.side, removeRange)
    : createGroup(view, target.spec, target.pos, content, target.side, removeRange);
}

// ─── Localização do bloco de nível superior sob o ponteiro ────────────────────

function topLevelBlockAt(view: EditorView, x: number, y: number) {
  const coords = view.posAtCoords({ left: x, top: y });
  if (!coords) return null;

  const doc = view.state.doc;
  const candidates = [coords.inside, coords.pos].filter(
    (value): value is number => typeof value === 'number' && value >= 0
  );

  for (const raw of candidates) {
    let $pos;
    try {
      $pos = doc.resolve(raw);
    } catch {
      continue;
    }

    let pos: number | null = null;
    if ($pos.depth >= 1) {
      pos = $pos.before(1);
    } else if ($pos.nodeAfter) {
      pos = raw;
    } else if ($pos.nodeBefore) {
      pos = raw - $pos.nodeBefore.nodeSize;
    }

    if (pos === null || pos < 0) continue;

    const node = doc.nodeAt(pos);
    if (!node) continue;

    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) continue;

    return { pos, node, dom };
  }

  return null;
}

/** O bloco alvo faz parte do que está sendo arrastado? */
function isDraggingItself(view: EditorView, pos: number, node: PMNode): boolean {
  const selection = view.state.selection;
  if (selection instanceof NodeSelection) {
    return selection.from === pos || (selection.from <= pos && selection.to >= pos + node.nodeSize);
  }
  if (draggedOrigin) {
    return draggedOrigin.pos === pos;
  }
  return selection.from < pos + node.nodeSize && selection.to > pos;
}

/** Slices parciais (metade de um parágrafo, texto solto) não viram coluna. */
function sliceIsWholeBlocks(slice: Slice | null | undefined): boolean {
  if (!slice) return true; // arquivos externos: validado depois
  if (slice.openStart !== 0 || slice.openEnd !== 0) return false;
  if (slice.content.childCount === 0) return false;
  return true;
}

function sliceNodes(slice: Slice | null | undefined): PMNode[] {
  if (!slice) return [];
  const nodes: PMNode[] = [];
  slice.content.forEach((node) => nodes.push(node));
  return nodes;
}

// ─── Extensão e Plugin ────────────────────────────────────────────────────────

export const DragToGroup = Extension.create({
  name: 'dragToGroup',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragToGroup'),

        props: {
          handleDOMEvents: {
            dragstart: (view, event) => {
              const dragEvent = event as DragEvent;
              const target = dragEvent.target as HTMLElement | null;
              if (!target) return false;

              let pos: number | null = null;
              try {
                const domPos = view.posAtDOM(target, 0);
                if (typeof domPos === 'number' && domPos >= 0) {
                  const $pos = view.state.doc.resolve(domPos);
                  pos = $pos.depth >= 1 ? $pos.before(1) : domPos;
                }
              } catch {
                /* fallback */
              }

              if (pos === null) {
                const block = topLevelBlockAt(view, dragEvent.clientX, dragEvent.clientY);
                if (block) pos = block.pos;
              }

              if (pos !== null && pos >= 0) {
                const node = view.state.doc.nodeAt(pos);
                if (node) {
                  draggedOrigin = { pos, node, nodeSize: node.nodeSize };
                  try {
                    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
                  } catch {
                    /* ignore */
                  }
                }
              }
              return false;
            },

            dragend: () => {
              clearDragState();
              return false;
            },

            dragover: (view, event) => {
              if (!view.isEditable) return false;

              const dragEvent = event as DragEvent;
              const block = topLevelBlockAt(view, dragEvent.clientX, dragEvent.clientY);
              if (!block) {
                clearDragState();
                return false;
              }

              const { pos, node, dom } = block;

              // Não cria coluna soltando o bloco sobre ele mesmo.
              if (isDraggingItself(view, pos, node)) {
                clearDragState();
                return false;
              }

              const rect = dom.getBoundingClientRect();
              if (rect.width === 0) {
                clearDragState();
                return false;
              }

              const edgeThreshold = Math.min(EDGE_MAX_PX, Math.max(EDGE_MIN_PX, rect.width * EDGE_RATIO));
              const mouseX = dragEvent.clientX;
              const nearLeft = mouseX - rect.left < edgeThreshold;
              const nearRight = rect.right - mouseX < edgeThreshold;

              if (!nearLeft && !nearRight) {
                clearDragState();
                return false;
              }

              const dragging = (view as any).dragging as { slice: Slice; move: boolean } | null;
              if (dragging && !sliceIsWholeBlocks(dragging.slice)) {
                clearDragState();
                return false;
              }

              const side = nearLeft ? 'left' : 'right';
              const dragged = dragging ? sliceNodes(dragging.slice) : [];

              // Alvo já é um grupo → acrescenta uma coluna.
              const groupSpec = getSpecForGroup(node);
              if (groupSpec) {
                const fits = node.childCount < groupSpec.maxChildren;
                const compatible = dragged.length === 0 || groupSpec.acceptsContent(dragged);
                if (!fits || !compatible) {
                  clearDragState();
                  return false;
                }
                activeTarget = { pos, side, mode: 'append', spec: groupSpec };
                showIndicator(rect, side);
                return false;
              }

              // Alvo é um bloco comum → cria um grupo novo.
              // Sem payload conhecido (arquivo externo) assumimos colunas.
              const spec = dragged.length > 0 ? pickSpecForPair(dragged, node) : pickSpecForPair([node], node);
              if (!spec) {
                clearDragState();
                return false;
              }

              activeTarget = { pos, side, mode: 'create', spec };
              showIndicator(rect, side);
              return false;
            },

            dragleave: (view, event) => {
              // Só limpa ao sair do editor de verdade. Antes, qualquer troca de
              // elemento filho disparava dragleave e o indicador piscava.
              const related = (event as DragEvent).relatedTarget as Node | null;
              if (!related || !view.dom.contains(related)) clearDragState();
              return false;
            },

            // IMPORTANTE: nada de limpar `activeTarget` aqui — `handleDrop`
            // roda DEPOIS deste handler e precisa do alvo. Só o visual sai.
            drop: () => {
              hideIndicator();
              return false;
            },
          },

          handleDrop(view, _event, slice, moved) {
            const target = activeTarget;
            if (!target) return false;

            const origin = draggedOrigin;
            clearDragState();

            if (!sliceIsWholeBlocks(slice)) return false;
            const content = sliceNodes(slice);
            if (content.length === 0) return false;

            let removeRange: { from: number; to: number } | null = null;
            if (moved) {
              // 1. Tenta usar a origem rastreada no dragstart
              if (origin) {
                const nodeAtOrigin = view.state.doc.nodeAt(origin.pos);
                if (nodeAtOrigin && (nodeAtOrigin === origin.node || nodeAtOrigin.type === origin.node.type)) {
                  removeRange = { from: origin.pos, to: origin.pos + nodeAtOrigin.nodeSize };
                } else {
                  // Procura o nó no documento se a posição mudou
                  let foundPos: number | null = null;
                  view.state.doc.descendants((candidate, pos) => {
                    if (foundPos !== null) return false;
                    if (pos === target.pos) return false;
                    if (candidate.type === origin.node.type && candidate.eq(origin.node)) {
                      foundPos = pos;
                      return false;
                    }
                    return true;
                  });
                  if (foundPos !== null) {
                    const foundNode = view.state.doc.nodeAt(foundPos);
                    if (foundNode) {
                      removeRange = { from: foundPos, to: foundPos + foundNode.nodeSize };
                    }
                  }
                }
              }

              // 2. Se não tinha origin, verifica se view.state.selection é NodeSelection que casa com o conteúdo arrastado
              if (!removeRange && view.state.selection instanceof NodeSelection) {
                const selNode = view.state.selection.node;
                const { from, to } = view.state.selection;
                if (content.some((c) => c.type === selNode.type)) {
                  removeRange = { from, to };
                }
              }

              // 3. Se ainda não achou e temos content[0], procura o nó idêntico no documento (diferente do alvo)
              if (!removeRange && content.length > 0) {
                const targetContent = content[0];
                let foundPos: number | null = null;
                view.state.doc.descendants((candidate, pos) => {
                  if (foundPos !== null) return false;
                  if (pos === target.pos) return false;
                  if (candidate.type === targetContent.type && candidate.eq(targetContent)) {
                    foundPos = pos;
                    return false;
                  }
                  return true;
                });
                if (foundPos !== null) {
                  const foundNode = view.state.doc.nodeAt(foundPos);
                  if (foundNode) {
                    removeRange = { from: foundPos, to: foundPos + foundNode.nodeSize };
                  }
                }
              }

              // 4. Se encontrou removeRange, valida se não é destrutivo (soltar em si mesmo)
              if (removeRange) {
                if (removeRange.from <= target.pos && removeRange.to >= target.pos) {
                  return false;
                }
              }
            }

            return applyGroupDrop(view, target, content, removeRange);
          },
        },
      }),
    ];
  },
});
