/**
 * DragToGroup.ts
 *
 * Arrastar um bloco até a borda esquerda/direita de outro cria um layout lado a
 * lado. O tipo de grupo vem do conteúdo: dois cards de link viram um
 * `linkGroup`; qualquer outra combinação vira um `columnGroup`.
 *
 * Divisão de responsabilidade com o ProseMirror:
 *
 *   • A ORIGEM é sempre dele. A extensão nunca calcula de onde o bloco veio: ela
 *     usa a mesma `Selection` que o `prosemirror-view` usaria, com a mesma
 *     precedência — `view.dragging.node` quando existe, senão a seleção do
 *     documento (ver `draggedSelection`). Remover é `selection.replace(tr)`.
 *
 *   • A ESTRUTURA é nossa: dado o alvo e o lado, envolvemos os dois blocos num
 *     grupo (ou acrescentamos uma coluna a um grupo existente).
 *
 * Só as bordas agrupam; o miolo do bloco é zona morta, onde o arrasto é uma
 * movimentação vertical comum resolvida pelo ProseMirror.
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

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GroupDropTarget {
  pos: number;
  side: 'left' | 'right';
  /** `create`: envolve o bloco alvo num grupo novo. `append`: soma uma coluna a um grupo existente. */
  mode: 'create' | 'append';
  spec: GroupSpec;
  /**
   * Tipo do node que estava em `pos` quando o alvo foi decidido, no `dragover`.
   *
   * O alvo pode ser aplicado bem depois disso: ao soltar ARQUIVOS, o
   * `useEditorDropPaste` só chama `applyGroupDrop` quando o `FileReader`
   * termina. Sem reconferir o tipo, uma edição nesse intervalo faria a posição
   * apontar para outro bloco, e o grupo se formaria em volta do bloco errado.
   */
  typeName: string;
}

/**
 * `view.dragging` é declarado somente-leitura nos tipos, mas o protocolo de
 * arrasto exige escrevê-lo. O campo `node` é a `NodeSelection` que o `dragstart`
 * do ProseMirror monta para um node view arrastado — e que ele NÃO despacha
 * para o state.
 */
type DraggingState = { slice: Slice; move: boolean; node?: Selection | null };
type DraggingView = EditorView & { dragging: DraggingState | null };
const draggable = (view: EditorView) => view as DraggingView;

/**
 * A seleção que representa o que está sendo arrastado.
 *
 * Mesma precedência do handler de drop do ProseMirror: `dragging.node` quando
 * existe (arrasto de node view — card de link, imagem, widget), senão a seleção
 * do documento (arrasto de texto, ou a alça flutuante, que a despacha).
 *
 * Usar só a seleção do documento fazia o node arrastado sobreviver ao "mover":
 * ele reaparecia no destino sem sair da origem, ou seja, duplicava.
 */
function draggedSelection(view: EditorView): Selection {
  return draggable(view).dragging?.node ?? view.state.selection;
}

// ─── Estado do arrasto ────────────────────────────────────────────────────────

/**
 * Amarrado à view, e não ao módulo, para que dois editores montados ao mesmo
 * tempo não disputem a mesma variável. O `Editor.tsx` precisa consultá-lo no
 * próprio `handleDrop`, que roda antes do dos plugins.
 */
const dragStates = new WeakMap<EditorView, { target: GroupDropTarget | null }>();

function dragStateFor(view: EditorView) {
  let state = dragStates.get(view);
  if (!state) {
    state = { target: null };
    dragStates.set(view, state);
  }
  return state;
}

// ─── Geometria ────────────────────────────────────────────────────────────────

/**
 * Distância entre a alça flutuante e a borda esquerda do bloco.
 *
 * Mora aqui, e não no hook da alça, porque é o arrasto que depende dela: quem
 * arrasta pela alça mantém o cursor deslocado deste tanto para a ESQUERDA do
 * conteúdo, e a zona de borda precisa alcançá-lo. Se as duas constantes se
 * separarem, agrupar pela alça deixa de funcionar.
 */
export const BLOCK_HANDLE_GAP = 26;

/** Fração da largura do bloco, de cada lado, que ativa o agrupamento. */
const EDGE_RATIO = 0.25;
/** Teto em px, para que blocos muito largos não virem alvo de borda gigante. */
const EDGE_MAX_PX = 120;
/** O ponteiro precisa andar isto para uma nova avaliação de `dragover`. */
const MIN_MOVE_PX = 3;

// ─── Indicador visual ─────────────────────────────────────────────────────────

/** Existe no máximo um arrasto por vez na página, logo um indicador só. */
let indicator: HTMLDivElement | null = null;

/**
 * O dropcursor do ProseMirror promete "solte aqui para mover". Enquanto a barra
 * vertical de agrupamento está visível a promessa é outra, e os dois juntos
 * diziam coisas diferentes ao mesmo tempo. A classe no `<body>` esconde um
 * enquanto o outro manda.
 */
const DROP_CURSOR_SUPPRESSOR = 'group-drop-active';

function showIndicator(rect: DOMRect, side: 'left' | 'right') {
  if (!indicator) {
    indicator = document.createElement('div');
    Object.assign(indicator.style, {
      position: 'fixed',
      width: '5px',
      borderRadius: '3px',
      background: '#8b5cf6',
      boxShadow: '0 0 14px 3px rgba(139, 92, 246, 0.95)',
      zIndex: '9999',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(indicator);
  }
  document.body.classList.add(DROP_CURSOR_SUPPRESSOR);
  indicator.style.left = `${side === 'left' ? Math.max(0, rect.left - 4) : Math.max(0, rect.right - 1)}px`;
  indicator.style.top = `${rect.top}px`;
  indicator.style.height = `${Math.max(rect.height, 32)}px`;
}

function hideIndicator() {
  indicator?.remove();
  indicator = null;
  document.body.classList.remove(DROP_CURSOR_SUPPRESSOR);
}

// ─── Ciclo de vida do arrasto ─────────────────────────────────────────────────

/**
 * Esquece o alvo imediatamente. Um alvo rejeitado que sobrevivesse alguns
 * milissegundos faria o bloco aterrissar num destino já inválido.
 */
function clearTarget(view: EditorView) {
  hideIndicator();
  const state = dragStates.get(view);
  if (state) state.target = null;
}

/** Fim do arrasto: cancela também a avaliação de `dragover` ainda agendada. */
function endDrag(view: EditorView) {
  cancelPendingEvaluate();
  clearTarget(view);
}

/**
 * Devolve (e limpa) o alvo atual. Usado pelo `Editor.tsx` ao soltar ARQUIVOS,
 * já que `editorProps.handleDrop` roda antes do `handleDrop` dos plugins.
 */
export function consumeGroupDropTarget(view: EditorView): GroupDropTarget | null {
  const target = dragStates.get(view)?.target ?? null;
  endDrag(view);
  return target;
}

/**
 * Abre um arrasto de bloco iniciado FORA do `view.dom` — hoje, a alça flutuante.
 *
 * Os `handleDOMEvents` do ProseMirror só enxergam eventos dentro do `view.dom`,
 * e a alça é irmã do editor: nenhum `dragstart` dispara para ela. Selecionar o
 * node e preencher `view.dragging` é exatamente o que o ProseMirror faria — e é
 * o que permite que ele próprio remova a origem no drop.
 */
export function startExternalBlockDrag(view: EditorView, pos: number): boolean {
  const node = view.state.doc.nodeAt(pos);
  if (!node) return false;

  const selection = NodeSelection.create(view.state.doc, pos);
  view.dispatch(view.state.tr.setSelection(selection));
  // `node` preenchido de propósito: assim este caminho e o do ProseMirror
  // removem a origem exatamente pelo mesmo mecanismo.
  draggable(view).dragging = { slice: selection.content(), move: true, node: selection };
  return true;
}

/** Contrapartida: sem isto o drop seguinte herdaria o slice do arrasto anterior. */
export function endExternalDrag(view: EditorView) {
  draggable(view).dragging = null;
  endDrag(view);
}

// ─── Conteúdo arrastado ───────────────────────────────────────────────────────

/** Nós reais contidos no slice, desembrulhando átomos inline de parágrafos abertos. */
function extractNodesFromSlice(slice: Slice | null | undefined): PMNode[] {
  if (!slice || slice.content.childCount === 0) return [];
  const nodes: PMNode[] = [];

  slice.content.forEach((node) => {
    if (!node.isTextblock) {
      nodes.push(node);
      return;
    }
    // Parágrafo: um átomo inline (widget, card) vale mais que o parágrafo que o embrulha.
    const atoms: PMNode[] = [];
    node.forEach((child) => {
      if (child.isAtom) atoms.push(child);
    });
    nodes.push(...(atoms.length > 0 ? atoms : [node]));
  });

  return nodes;
}

/** O bloco alvo faz parte do que está sendo arrastado? */
function isDraggingItself(view: EditorView, pos: number, node: PMNode): boolean {
  const selection = draggedSelection(view);
  if (!(selection instanceof NodeSelection)) return false;
  return selection.from === pos || (selection.from >= pos && selection.to <= pos + node.nodeSize);
}

// ─── Avaliação do alvo ────────────────────────────────────────────────────────

let pendingFrame: number | null = null;
let lastEvaluated = { x: NaN, y: NaN };

function cancelPendingEvaluate() {
  if (pendingFrame !== null) {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  }
  lastEvaluated = { x: NaN, y: NaN };
}

/**
 * O `dragover` dispara dezenas de vezes por segundo, mesmo com o ponteiro
 * parado, e cada avaliação lê layout. Duas barreiras: o ponteiro precisa ter
 * andado alguns pixels, e a avaliação acontece no máximo uma vez por frame.
 */
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

/** Decide (e desenha) o alvo do arrasto para um ponto da tela. */
function evaluateDropTarget(view: EditorView, x: number, y: number) {
  const block = topLevelBlockAt(view, x, y);
  if (!block) return clearTarget(view);

  const { pos, node, dom } = block;
  if (isDraggingItself(view, pos, node)) return clearTarget(view);

  const rect = dom.getBoundingClientRect();
  if (rect.width === 0) return clearTarget(view);

  /*
   * A zona de borda vale um pouco para FORA do bloco, mas só um pouco.
   *
   * Ilimitada para fora (o que acontece sem checagem alguma, já que
   * `posAtCoords` encaixa no bloco mais próximo e nunca devolve nulo por
   * distância) todo ponto da margem virava "borda esquerda", e arrastar pela
   * margem criava coluna atrás de coluna.
   *
   * Restrita ao rect, o oposto: a alça flutuante fica em `rect.left - GAP`, e o
   * cursor de quem arrasta por ela nunca entra no bloco — não dá para agrupar.
   *
   * A folga é exatamente o deslocamento da alça, que é o único motivo
   * legítimo para o cursor estar fora do bloco durante um arrasto.
   */
  const folga = BLOCK_HANDLE_GAP;
  if (x < rect.left - folga || x > rect.right + folga || y < rect.top || y > rect.bottom) {
    return clearTarget(view);
  }

  const edge = Math.min(EDGE_MAX_PX, rect.width * EDGE_RATIO);
  let side: 'left' | 'right';
  if (x <= rect.left + edge) side = 'left';
  else if (x >= rect.right - edge) side = 'right';
  else return clearTarget(view); // zona morta: o drop é do ProseMirror

  const dragged = extractNodesFromSlice(draggable(view).dragging?.slice);

  // Alvo já é um grupo → acrescenta uma coluna.
  const groupSpec = getSpecForGroup(node);
  if (groupSpec) {
    const fits = node.childCount < groupSpec.maxChildren;
    const compatible = dragged.length === 0 || groupSpec.acceptsContent(dragged);
    if (!fits || !compatible) return clearTarget(view);

    dragStateFor(view).target = { pos, side, mode: 'append', spec: groupSpec, typeName: node.type.name };
    showIndicator(rect, side);
    return;
  }

  // Alvo é um bloco comum → cria um grupo novo.
  const spec = pickSpecForPair(dragged.length > 0 ? dragged : [node], node);
  if (!spec) return clearTarget(view);

  dragStateFor(view).target = { pos, side, mode: 'create', spec, typeName: node.type.name };
  showIndicator(rect, side);
}

// ─── Aplicação ────────────────────────────────────────────────────────────────

/**
 * Aplica um alvo sobre uma transação. Exportada para teste: é aqui que mora a
 * revalidação do alvo, e ela não deveria exigir uma `EditorView` para ser
 * verificada.
 */
export function applyGroupDropInTr(
  tr: Transaction,
  target: GroupDropTarget,
  content: PMNode[],
  source: GroupContentSource
): boolean {
  // O alvo foi decidido no `dragover`, possivelmente há bastante tempo. Se o
  // node em `pos` já não é o mesmo, agrupar ali seria agrupar o bloco errado.
  const current = safeNodeAt(tr.doc, target.pos);
  if (!current || current.type.name !== target.typeName) return false;

  if (target.spec.acceptsContent(content)) {
    return target.mode === 'append'
      ? appendToGroupInTr(tr, target.pos, content, target.side, source)
      : createGroupInTr(tr, target.spec, target.pos, content, target.side, source);
  }

  // Ex.: arrastar uma imagem para a borda de um grupo de links.
  if (target.mode === 'append') return false;
  const fallback = pickSpecForPair(content, current);
  if (!fallback) return false;
  return createGroupInTr(tr, fallback, target.pos, content, target.side, source);
}

/** Aplica um alvo já consumido — o `Editor.tsx` usa isso para imagens soltas. */
export function applyGroupDrop(
  view: EditorView,
  target: GroupDropTarget,
  content: PMNode[],
  source?: GroupContentSource
): boolean {
  const tr = view.state.tr;
  if (!applyGroupDropInTr(tr, target, content, source) || !tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

// ─── Extensão ─────────────────────────────────────────────────────────────────

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
                // O frame agendado rodaria com o cursor já fora do editor.
                cancelPendingEvaluate();
                clearTarget(view);
              }
              return false;
            },

            drop: () => {
              // Só o visual. O ALVO tem de sobreviver até o `handleDrop`, que
              // roda logo depois deste handler.
              cancelPendingEvaluate();
              hideIndicator();
              return false;
            },
          },

          handleDrop(view, _event, slice, moved) {
            const target = dragStateFor(view).target;
            endDrag(view);
            if (!target) return false;

            const dragging = draggable(view).dragging;
            const content = extractNodesFromSlice(dragging?.slice ?? slice);
            if (content.length === 0) return false;

            // Num "copiar" nada é removido da origem.
            const dragged = draggedSelection(view);
            const source: GroupContentSource = moved ? dragged : null;

            // Soltar um node sobre ele mesmo não faz sentido.
            if (moved && dragged.from <= target.pos && dragged.to >= target.pos) return false;

            /*
             * A seleção do arrasto foi montada no `dragstart` e não acompanha
             * mudanças do documento. Se uma edição remota do Yjs chegou durante
             * o arrasto, ela aponta para outro lugar, e removê-la apagaria o
             * node errado. Devolver o drop ao ProseMirror é o pior caso
             * aceitável: no máximo não agrupa.
             */
            if (moved && dragged instanceof NodeSelection) {
              const atOrigin = safeNodeAt(view.state.doc, dragged.from);
              if (!atOrigin || atOrigin.type !== dragged.node.type) return false;
            }

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
