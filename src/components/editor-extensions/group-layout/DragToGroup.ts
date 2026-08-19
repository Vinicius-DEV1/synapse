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
 * Soltar em QUALQUER ponto sobre um bloco agrupa — metade esquerda cria a
 * coluna à esquerda, metade direita à direita. Mover continua possível soltando
 * na margem do editor ou no vão entre dois blocos, onde quem responde é o
 * dropcursor do ProseMirror.
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
interface DragState {
  target: GroupDropTarget | null;
  /**
   * Quanto o ponteiro está à ESQUERDA do bloco que ele arrasta, medido no
   * `dragstart`. Ver `computeDropTarget`.
   */
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

// ─── Geometria ────────────────────────────────────────────────────────────────

/** O ponteiro precisa andar isto para uma nova avaliação de `dragover`. */
const MIN_MOVE_PX = 3;

/**
 * Fatia central da largura do bloco reservada ao MOVER.
 *
 * As três zonas de um bloco: 40% à esquerda agrupam à esquerda, 40% à direita
 * agrupam à direita, os 20% do meio movem. Numa coluna de 600px isso dá 240px
 * de alvo para cada coluna e 120px para o mover — todos grandes, e o indicador
 * (barra roxa) ou o dropcursor (linha) dizem qual vai acontecer antes de soltar.
 *
 * Antes era metade/metade: agrupar em qualquer ponto do bloco, mover só no vão
 * entre blocos. Mas o vão é a MARGEM do bloco (`my-4`, 32px), e ali o alvo era
 * nulo: soltar a poucos pixels do bloco não agrupava nada e virava um mover
 * silencioso. Era o "arrasto e solto e não forma coluna, só troca de posição".
 */
const MOVE_BAND_RATIO = 0.2;

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

/** Zera a folga medida: ela vale por arrasto, nunca para o seguinte. */
function clearGrip(view: EditorView) {
  const state = dragStates.get(view);
  if (state) state.grip = 0;
}

/** Fim do arrasto: cancela também a avaliação de `dragover` ainda agendada. */
function endDrag(view: EditorView) {
  cancelPendingEvaluate();
  clearTarget(view);
  clearGrip(view);
}

/**
 * Devolve (e limpa) o alvo atual. Usado pelo `Editor.tsx` ao soltar ARQUIVOS,
 * já que `editorProps.handleDrop` roda antes do `handleDrop` dos plugins.
 *
 * Passando o ponto do drop, o alvo é refeito ali mesmo — pelo mesmo motivo que
 * o `handleDrop` refaz: o guardado é de um frame que pode nunca ter rodado.
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
 * Abre um arrasto de bloco iniciado FORA do `view.dom` — hoje, a alça flutuante.
 *
 * Os `handleDOMEvents` do ProseMirror só enxergam eventos dentro do `view.dom`,
 * e a alça é irmã do editor: nenhum `dragstart` dispara para ela. Selecionar o
 * node e preencher `view.dragging` é exatamente o que o ProseMirror faria — e é
 * o que permite que ele próprio remova a origem no drop.
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
    // Lança quando a posição não admite uma seleção de node — vale abortar o
    // arrasto, não derrubar o editor no meio de um `dragstart`.
    selection = NodeSelection.create(view.state.doc, pos);
  } catch {
    return false;
  }

  view.dispatch(view.state.tr.setSelection(selection));
  // `node` preenchido de propósito: assim este caminho e o do ProseMirror
  // removem a origem exatamente pelo mesmo mecanismo.
  draggable(view).dragging = { slice: selection.content(), move: true, node: selection };
  dragStateFor(view).grip = measureGrip(view, pos, pointerX);
  armExternalDragCleanup(view);
  return true;
}

/**
 * Quanto o ponteiro está à esquerda do bloco que ele arrasta.
 *
 * A alça flutuante mora FORA do conteúdo, a alguns pixels da margem esquerda do
 * bloco. Quem arrasta por ela mantém o cursor ali o arrasto inteiro — e um alvo
 * medido só pelo retângulo do bloco nunca o alcança. Em vez de repetir a
 * constante do posicionamento da alça (duas constantes que se separam calada e
 * inevitavelmente), a folga é MEDIDA aqui, uma vez, e vale para o arrasto todo.
 */
function measureGrip(view: EditorView, pos: number, pointerX?: number): number {
  if (typeof pointerX !== 'number' || !Number.isFinite(pointerX)) return 0;
  const dom = view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return 0;
  const rect = dom.getBoundingClientRect();
  if (rect.width === 0) return 0;
  // Só a folga à esquerda interessa: é o único motivo legítimo para o cursor
  // estar fora do bloco durante um arrasto.
  return Math.max(0, Math.round(rect.left - pointerX));
}

/**
 * Seleciona o node em `pos` para que um arrasto começado nele remova a ORIGEM
 * certa. É o que os node views com alça própria (card de link, imagem) chamam
 * no `mousedown`.
 *
 * Por que eles precisam: o `dragstart` do ProseMirror só preenche
 * `dragging.node` quando a seleção do documento NÃO cobre o ponto clicado.
 * Cobrindo, ele deixa o campo vazio e, ao soltar, apaga a SELEÇÃO — que
 * portanto tem de ser o node arrastado.
 *
 * A conferência é o ponto. Um `getPos` atrasado — o node view renderiza antes
 * de o documento assentar — apontaria para o VIZINHO, e seria o vizinho que o
 * drop apagaria: o bloco arrastado reaparecia no destino sem sair da origem, o
 * "movi e duplicou". Sem certeza de qual node está ali, é melhor não mexer na
 * seleção: no pior caso o ProseMirror cai no `mightDrag`, que resolve sozinho.
 */
export function selectNodeForDrag(view: EditorView, pos: number, node: PMNode): boolean {
  const doc = view.state.doc;
  const at = safeNodeAt(doc, pos);
  const target = at === node || at?.eq(node) ? pos : findNodePos(doc, node);
  if (target === null) return false;

  try {
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(doc, target)));
    return true;
  } catch {
    return false;
  }
}

/** Onde este node está de verdade, quando a posição do node view atrasou. */
function findNodePos(doc: PMNode, node: PMNode): number | null {
  let found: number | null = null;
  doc.descendants((candidate, pos) => {
    if (found !== null) return false;
    if (candidate === node) { found = pos; return false; }
    return true;
  });
  return found;
}

/** Contrapartida: sem isto o drop seguinte herdaria o slice do arrasto anterior. */
export function endExternalDrag(view: EditorView) {
  disarmExternalCleanup?.();
  draggable(view).dragging = null;
  endDrag(view);
}

/** Remove a rede de segurança armada por `armExternalDragCleanup`. */
let disarmExternalCleanup: (() => void) | null = null;

/**
 * Rede de segurança do arrasto externo.
 *
 * O `dragend` da alça é um handler React NO PRÓPRIO elemento, e a alça pode
 * desaparecer no meio do arrasto: qualquer atualização do documento a esconde —
 * a resposta de metadados de um card, um upload que terminou, uma edição remota
 * do Yjs. Some a alça, some o handler, e ninguém limpa `view.dragging`: ele
 * sobrevive ao arrasto guardando o slice antigo, e o PRÓXIMO drop — de um
 * arquivo, de um texto de fora — reinsere aquele conteúdo. O bloco aparece
 * duplicado sem que ninguém o tenha arrastado.
 *
 * Ouvir no `window` fecha o buraco independentemente do que aconteça com a
 * alça. Fase de BOLHA de propósito: na captura, o `drop` seria limpo antes de o
 * ProseMirror chegar a usar `view.dragging`.
 */
function armExternalDragCleanup(view: EditorView) {
  disarmExternalCleanup?.();
  if (typeof window === 'undefined') return;

  const finish = () => endExternalDrag(view);
  window.addEventListener('dragend', finish);
  window.addEventListener('drop', finish);

  disarmExternalCleanup = () => {
    window.removeEventListener('dragend', finish);
    window.removeEventListener('drop', finish);
    disarmExternalCleanup = null;
  };
}

// ─── Conteúdo arrastado ───────────────────────────────────────────────────────

/**
 * O átomo inline que está SOZINHO dentro de um parágrafo — um card, um alarme,
 * uma referência de página. Aí o parágrafo é só embalagem: o que foi arrastado
 * é o widget.
 *
 * `isAtom` sozinho não serve de teste: no ProseMirror TEXTO também é átomo. A
 * regra antiga recolhia todo filho `isAtom` de um textblock e descartava o
 * resto, o que picotava um parágrafo formatado em um bloco por trecho de marca
 * ("Olá **mundo**" virava dois parágrafos, sem o negrito) e rebaixava qualquer
 * título a parágrafo — o bloco era remontado a partir dos pedaços e perdia a
 * própria identidade no caminho.
 */
function unwrapLoneInlineAtom(node: PMNode): PMNode | null {
  if (!node.isTextblock || node.childCount !== 1) return null;
  const only = node.firstChild;
  if (!only || only.isText || !only.isAtom) return null;
  return only;
}

/**
 * Nós reais contidos no slice, desembrulhando átomos inline de parágrafos
 * abertos. Exportada para teste: é a fronteira por onde o conteúdo arrastado
 * entra, e onde um bloco já foi picotado em pedaços mais de uma vez.
 */
export function extractNodesFromSlice(slice: Slice | null | undefined): PMNode[] {
  if (!slice || slice.content.childCount === 0) return [];
  const nodes: PMNode[] = [];
  slice.content.forEach((node) => nodes.push(unwrapLoneInlineAtom(node) ?? node));
  return nodes;
}

/**
 * O conteúdo que vai entrar no grupo.
 *
 * Num MOVER o node é lido do documento AGORA, e não do slice montado lá atrás
 * no `dragstart`. Entre um instante e outro cabem a resposta de metadados de um
 * card de link, um upload de imagem que virou atributo, uma edição remota do
 * Yjs: reinserir o slice antigo desfazia tudo isso — a origem sumia com o valor
 * novo e o destino nascia com o velho, e o card recomeçava o "carregando…".
 */
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

/**
 * A faixa vertical que um bloco ocupa, até a METADE do vão que o separa do
 * vizinho — e não até a borda pintada.
 *
 * A margem de um bloco pertence a ele. Cards e grupos usam `my-4`, o que abre
 * 32px entre um e outro onde o alvo era simplesmente nulo: soltar a poucos
 * pixels do bloco não agrupava e virava um mover silencioso. Com a faixa indo
 * até a metade do vão, todo ponto do editor pertence a exatamente um bloco, e
 * não há mais buraco entre eles.
 */
function verticalBand(view: EditorView, dom: HTMLElement, rect: DOMRect) {
  const editor = view.dom.getBoundingClientRect();
  const prev = dom.previousElementSibling?.getBoundingClientRect();
  const next = dom.nextElementSibling?.getBoundingClientRect();

  return {
    // O irmão só entra na conta se estiver mesmo acima/abaixo: com imagens
    // alinhadas e flutuantes, o anterior no DOM pode estar ao LADO.
    top: prev && prev.bottom <= rect.top ? (prev.bottom + rect.top) / 2 : Math.min(rect.top, editor.top),
    bottom: next && next.top >= rect.bottom ? (rect.bottom + next.top) / 2 : Math.max(rect.bottom, editor.bottom),
  };
}

/**
 * A zona do bloco sob o ponteiro: coluna à esquerda, coluna à direita, ou
 * nenhuma — e nenhuma significa MOVER, com o dropcursor do ProseMirror
 * respondendo pelo drop.
 *
 * As três faixas horizontais são 40% / 20% / 40%: as pontas agrupam, o miolo
 * move. É o que dá ao mover um alvo próprio e visível DENTRO do bloco, em vez
 * de deixá-lo espremido no vão entre dois — que era onde ele estava, e por isso
 * agrupar falhava tanto.
 *
 * A folga da alça estica só a checagem de "está sobre o bloco"; o centro
 * continua sendo o centro real, para que os dois lados fiquem iguais.
 */
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

/**
 * Decide o alvo do arrasto para um ponto da tela.
 *
 * Não guarda estado nem desenha nada: é a conta pura. O `drop` precisa refazê-la
 * na hora, com as coordenadas de onde o botão foi de fato solto — ver
 * `handleDrop`.
 */
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

  // Alvo já é um grupo → acrescenta uma coluna.
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

  // Alvo é um bloco comum → cria um grupo novo.
  const spec = pickSpecForPair(dragged.length > 0 ? dragged : [node], node);
  if (!spec) return null;

  return { target: { pos, side, mode: 'create', spec, typeName: node.type.name }, rect };
}

/** Decide, guarda e desenha o alvo — o caminho do `dragover`. */
function evaluateDropTarget(view: EditorView, x: number, y: number) {
  const found = computeDropTarget(view, x, y);
  if (!found) return clearTarget(view);

  dragStateFor(view).target = found.target;
  showIndicator(found.rect, found.target.side);
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

          handleDrop(view, event, slice, moved) {
            const dragging = draggable(view).dragging;

            /*
             * O alvo é REFEITO aqui, com as coordenadas de onde o botão foi
             * solto.
             *
             * O `dragover` avalia no máximo uma vez por frame, e o handler de
             * `drop` cancela o frame que ainda não rodou. Quem entrasse na
             * metade do bloco e soltasse em seguida — que é como se solta,
             * rápido — caía com o alvo do frame ANTERIOR, quase sempre nenhum:
             * o "às vezes não agrupa". Refazendo a conta, o alvo passa a ser
             * sempre o do ponto onde o usuário realmente soltou.
             */
            const target = computeDropTarget(view, event.clientX, event.clientY)?.target ?? null;
            endDrag(view);
            if (!target) return false;

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
