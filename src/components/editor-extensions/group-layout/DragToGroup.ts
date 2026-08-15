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

// Estado do arrasto em curso. Module-level de propósito: o Editor.tsx precisa
// consultá-lo no próprio `handleDrop`, que roda antes do dos plugins.
let activeTarget: GroupDropTarget | null = null;
let indicator: HTMLDivElement | null = null;
let draggedOrigin: { pos: number; node: PMNode; nodeSize: number } | null = null;
let cleanupTimer: any = null;

function hideIndicator() {
  indicator?.remove();
  indicator = null;
}

function clearDragState(immediate = false) {
  hideIndicator();
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  if (immediate) {
    activeTarget = null;
    draggedOrigin = null;
  } else {
    // Delay de segurança: em alguns navegadores o evento dragend/dragleave dispara
    // milissegundos antes do ProseMirror processar handleDrop. Manter activeTarget por
    // 200ms garante que handleDrop receba o alvo sem falhas.
    cleanupTimer = setTimeout(() => {
      activeTarget = null;
      draggedOrigin = null;
      cleanupTimer = null;
    }, 200);
  }
}

function showIndicator(rect: DOMRect, side: 'left' | 'right') {
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.width = '5px';
    indicator.style.borderRadius = '3px';
    indicator.style.background = '#8b5cf6';
    indicator.style.boxShadow = '0 0 14px 3px rgba(139, 92, 246, 0.95)';
    indicator.style.zIndex = '9999';
    indicator.style.pointerEvents = 'none';
    indicator.style.transition = 'left 0.05s ease, top 0.05s ease, height 0.05s ease';
    document.body.appendChild(indicator);
  }
  indicator.style.left = `${side === 'left' ? Math.max(0, rect.left - 4) : Math.max(0, rect.right - 1)}px`;
  indicator.style.top = `${rect.top}px`;
  indicator.style.height = `${Math.max(rect.height, 32)}px`;
}

/**
 * Devolve (e limpa) o alvo do arrasto atual.
 * Usado pelo Editor.tsx ao soltar ARQUIVOS, já que `editorProps.handleDrop`
 * roda antes do `handleDrop` dos plugins.
 */
export function consumeGroupDropTarget(): GroupDropTarget | null {
  const target = activeTarget;
  clearDragState(true);
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
    const targetNode = view.state.doc.nodeAt(target.pos);
    if (!targetNode) return false;
    const fallback = pickSpecForPair(content, targetNode);
    if (!fallback) return false;
    return createGroup(view, fallback, target.pos, content, target.side, removeRange);
  }

  return target.mode === 'append'
    ? appendToGroup(view, target.pos, content, target.side, removeRange)
    : createGroup(view, target.spec, target.pos, content, target.side, removeRange);
}

// ─── Localização do bloco de nível superior sob o ponteiro ────────────────────

function topLevelBlockAt(view: EditorView, x: number, y: number) {
  const doc = view.state.doc;

  const tryResolve = (raw: number) => {
    try {
      const $pos = doc.resolve(raw);
      const pos = $pos.depth >= 1 ? $pos.before(1) : raw;
      if (pos >= 0 && pos < doc.content.size) {
        const node = doc.nodeAt(pos);
        if (node) {
          const dom = view.nodeDOM(pos);
          if (dom instanceof HTMLElement) {
            return { pos, node, dom };
          }
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  // 1. Tenta posAtCoords do ProseMirror
  const coords = view.posAtCoords({ left: x, top: y });
  if (coords) {
    if (typeof coords.inside === 'number' && coords.inside >= 0) {
      const found = tryResolve(coords.inside);
      if (found) return found;
    }
    if (typeof coords.pos === 'number' && coords.pos >= 0) {
      const found = tryResolve(coords.pos);
      if (found) return found;
    }
  }

  // 2. Fallback via DOM elementFromPoint (garante localização precisa sobre NodeViews)
  const el = document.elementFromPoint(x, y);
  if (el) {
    const editorDom = view.dom;
    if (editorDom.contains(el)) {
      let current: HTMLElement | null = el as HTMLElement;
      while (current && current.parentElement && current.parentElement !== editorDom) {
        current = current.parentElement;
      }
      if (current && current.parentElement === editorDom) {
        try {
          const domPos = view.posAtDOM(current, 0);
          if (typeof domPos === 'number' && domPos >= 0) {
            return tryResolve(domPos);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  return null;
}

/** O bloco alvo faz parte do que está sendo arrastado? */
function isDraggingItself(view: EditorView, pos: number, node: PMNode): boolean {
  const selection = view.state.selection;
  if (selection instanceof NodeSelection) {
    if (selection.from === pos) return true;
    if (selection.from >= pos && selection.to <= pos + node.nodeSize) return true;
  }
  if (draggedOrigin) {
    if (draggedOrigin.pos === pos) return true;
    if (draggedOrigin.pos >= pos && draggedOrigin.pos + draggedOrigin.nodeSize <= pos + node.nodeSize) {
      return true;
    }
  }
  return false;
}

/** Extrai os nós reais contidos no slice, desembrulhando átomos inline de parágrafos abertos. */
function extractNodesFromSlice(slice: Slice | null | undefined): PMNode[] {
  if (!slice || slice.content.childCount === 0) return [];
  const nodes: PMNode[] = [];

  slice.content.forEach((node) => {
    if (node.isBlock && !node.isTextblock) {
      // Blocos diretos (ex: resizableImage, encryptedImage, linkPreview, etc.)
      nodes.push(node);
    } else if (node.isTextblock) {
      // Parágrafo: verifica se contém átomos inline (ex: widgets)
      let foundAtom = false;
      node.forEach((child) => {
        if (child.isAtom) {
          nodes.push(child);
          foundAtom = true;
        }
      });
      // Se não tinha átomo, é bloco de texto normal
      if (!foundAtom) {
        nodes.push(node);
      }
    } else {
      nodes.push(node);
    }
  });

  return nodes;
}

/** Valida se o slice pode virar coluna (rejeita apenas seleções parciais de caracteres sem átomos). */
function sliceIsWholeBlocks(slice: Slice | null | undefined): boolean {
  if (!slice) return true; // arquivos externos
  if (slice.content.childCount === 0) return false;
  return extractNodesFromSlice(slice).length > 0;
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

              // 1. Se já há uma NodeSelection ativa (ex: widget ou imagem clicada)
              if (view.state.selection instanceof NodeSelection) {
                const sel = view.state.selection;
                draggedOrigin = { pos: sel.from, node: sel.node, nodeSize: sel.node.nodeSize };
                return false;
              }

              // 2. Tenta obter a posição exata pelo DOM
              let pos: number | null = null;
              try {
                const domPos = view.posAtDOM(target, 0);
                if (typeof domPos === 'number' && domPos >= 0) {
                  const $pos = view.state.doc.resolve(domPos);
                  if ($pos.nodeAfter && $pos.nodeAfter.isAtom) {
                    pos = domPos;
                  } else if ($pos.nodeBefore && $pos.nodeBefore.isAtom) {
                    pos = domPos - $pos.nodeBefore.nodeSize;
                  } else {
                    pos = $pos.depth >= 1 ? $pos.before(1) : domPos;
                  }
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
                }
              }
              return false;
            },

            dragend: () => {
              clearDragState(false);
              return false;
            },

            dragover: (view, event) => {
              if (!view.editable) return false;

              const dragEvent = event as DragEvent;
              const block = topLevelBlockAt(view, dragEvent.clientX, dragEvent.clientY);
              if (!block) {
                clearDragState(false);
                return false;
              }

              const { pos, node, dom } = block;

              // Não cria coluna soltando o bloco sobre ele mesmo.
              if (isDraggingItself(view, pos, node)) {
                clearDragState(false);
                return false;
              }

              const rect = dom.getBoundingClientRect();
              if (rect.width === 0) {
                clearDragState(false);
                return false;
              }

              const dragging = (view as any).dragging as { slice: Slice; move: boolean } | null;
              if (dragging && !sliceIsWholeBlocks(dragging.slice)) {
                clearDragState(false);
                return false;
              }

              // Metade esquerda -> coluna à esquerda / Metade direita -> coluna à direita
              const mouseX = dragEvent.clientX;
              const side: 'left' | 'right' = mouseX < rect.left + rect.width / 2 ? 'left' : 'right';
              const dragged = dragging
                ? extractNodesFromSlice(dragging.slice)
                : draggedOrigin
                ? [draggedOrigin.node]
                : [];

              // Alvo já é um grupo → acrescenta uma coluna.
              const groupSpec = getSpecForGroup(node);
              if (groupSpec) {
                const fits = node.childCount < groupSpec.maxChildren;
                const compatible = dragged.length === 0 || groupSpec.acceptsContent(dragged);
                if (!fits || !compatible) {
                  clearDragState(false);
                  return false;
                }
                activeTarget = { pos, side, mode: 'append', spec: groupSpec };
                showIndicator(rect, side);
                return false;
              }

              // Alvo é um bloco comum → cria um grupo novo.
              const spec = dragged.length > 0 ? pickSpecForPair(dragged, node) : pickSpecForPair([node], node);
              if (!spec) {
                clearDragState(false);
                return false;
              }

              activeTarget = { pos, side, mode: 'create', spec };
              showIndicator(rect, side);
              return false;
            },

            dragleave: (view, event) => {
              const related = (event as DragEvent).relatedTarget as Node | null;
              if (!related || !view.dom.contains(related)) {
                clearDragState(false);
              }
              return false;
            },

            drop: () => {
              hideIndicator();
              return false;
            },
          },

          handleDrop(view, _event, slice, _moved) {
            const target = activeTarget;
            if (!target) return false;

            const origin = draggedOrigin;
            clearDragState(true);

            let content = extractNodesFromSlice(slice);
            if (content.length === 0 && origin) {
              content = [origin.node];
            }
            if (content.length === 0) return false;

            let removeRange: { from: number; to: number } | null = null;

            // 1. Tenta usar a origem rastreada no dragstart
            if (origin) {
              const nodeAtOrigin = view.state.doc.nodeAt(origin.pos);
              if (nodeAtOrigin && (nodeAtOrigin.type === origin.node.type || nodeAtOrigin.eq(origin.node))) {
                removeRange = { from: origin.pos, to: origin.pos + nodeAtOrigin.nodeSize };
              }
            }

            // 2. Se não tinha origin, verifica NodeSelection
            if (!removeRange && view.state.selection instanceof NodeSelection) {
              const sel = view.state.selection;
              removeRange = { from: sel.from, to: sel.to };
            }

            // 3. Se ainda não achou e temos content[0], procura o nó idêntico no documento
            if (!removeRange && content.length > 0) {
              const targetNode = content[0];
              let foundPos: number | null = null;
              view.state.doc.descendants((candidate, pos) => {
                if (foundPos !== null) return false;
                if (pos === target.pos) return false;
                if (candidate.type === targetNode.type) {
                  if (candidate.eq(targetNode)) {
                    foundPos = pos;
                    return false;
                  }
                  if (candidate.attrs && targetNode.attrs) {
                    const idA = candidate.attrs.url || candidate.attrs.driveFileId || candidate.attrs.sessionId || candidate.attrs.fileId || candidate.attrs.alarmId || candidate.attrs.eventId || candidate.attrs.mediaId || candidate.attrs.src;
                    const idB = targetNode.attrs.url || targetNode.attrs.driveFileId || targetNode.attrs.sessionId || targetNode.attrs.fileId || targetNode.attrs.alarmId || targetNode.attrs.eventId || targetNode.attrs.mediaId || targetNode.attrs.src;
                    if (idA && idA === idB) {
                      foundPos = pos;
                      return false;
                    }
                  }
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

            // 4. Valida se não é soltar em si mesmo
            if (removeRange && removeRange.from <= target.pos && removeRange.to >= target.pos) {
              return false;
            }

            return applyGroupDrop(view, target, content, removeRange);
          },
        },
      }),
    ];
  },
});

