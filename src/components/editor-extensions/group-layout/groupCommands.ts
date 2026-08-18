/**
 * groupCommands.ts
 *
 * Operações de documento sobre grupos lado a lado — sem React, sem DOM.
 *
 * Cada operação existe em duas formas: uma que trabalha sobre uma `Transaction`
 * (`...InTr`, componível, usada quando já há uma transação em andamento) e um
 * invólucro que monta a transação e despacha. A lógica mora só na primeira.
 *
 * Duas regras valem em todas elas:
 *   • a posição do alvo é remapeada DEPOIS de qualquer remoção;
 *   • o tamanho do node é lido de novo do documento já alterado, nunca guardado
 *     de antes.
 */

import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { Selection } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import type { GroupSpec } from './groupSpecs';
import { getSpecForGroup } from './groupSpecs';

export interface GroupRef {
  spec: GroupSpec;
  pos: number;
  node: PMNode;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * `doc.nodeAt` LANÇA para posições fora do documento, em vez de devolver null.
 *
 * Toda posição usada aqui foi capturada antes da operação — o alvo de um
 * arrasto vem do `dragover`, o `getPos` de um node view vem do render anterior —
 * e o documento pode ter encolhido nesse meio-tempo (edição remota do Yjs, um
 * `appendTransaction`, o próprio drop). Nesses casos a resposta certa é "não
 * existe mais", não uma exceção subindo pelo meio de um handler de drop.
 */
export function safeNodeAt(doc: PMNode, pos: number): PMNode | null {
  if (!Number.isInteger(pos) || pos < 0 || pos >= doc.content.size) return null;
  return doc.nodeAt(pos);
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

/** Localiza o grupo em `pos`, garantindo que ele ainda existe e é do tipo esperado. */
export function resolveGroup(view: EditorView, pos: number | null | undefined): GroupRef | null {
  if (typeof pos !== 'number') return null;
  const node = safeNodeAt(view.state.doc, pos);
  if (!node) return null;
  const spec = getSpecForGroup(node);
  return spec ? { spec, pos, node } : null;
}

export function getChildren(groupNode: PMNode): PMNode[] {
  const children: PMNode[] = [];
  groupNode.forEach((child) => children.push(child));
  return children;
}

/** Posição absoluta de cada filho dentro do documento. */
export function getChildPositions(groupPos: number, groupNode: PMNode): number[] {
  const positions: number[] = [];
  let offset = groupPos + 1; // pula a tag de abertura do grupo
  groupNode.forEach((child) => {
    positions.push(offset);
    offset += child.nodeSize;
  });
  return positions;
}

function readWidth(spec: GroupSpec, child: PMNode): number {
  const raw = Number(child.attrs[spec.widthAttr]);
  return Number.isFinite(raw) && raw > 0 ? raw : spec.defaultWidth;
}

export function getWidths(spec: GroupSpec, groupNode: PMNode): number[] {
  return getChildren(groupNode).map((child) => readWidth(spec, child));
}

/** Conteúdo do grupo achatado, na ordem das colunas. */
export function flattenGroup(spec: GroupSpec, groupNode: PMNode): PMNode[] {
  return getChildren(groupNode).flatMap((child) => spec.childContent(child));
}

/** Redistribui as larguras igualmente entre um conjunto de filhos. */
export function rebalance(spec: GroupSpec, children: PMNode[]): PMNode[] {
  const width = round1(100 / children.length);
  return children.map((child) =>
    child.type.create({ ...child.attrs, [spec.widthAttr]: width }, child.content, child.marks)
  );
}

/**
 * Escreve o que deve sobrar de um grupo na faixa `range`.
 *
 * Com dois filhos ou mais, o grupo é reescrito com as larguras redistribuídas.
 * Com menos, ele é desfeito e fica só o conteúdo achatado — o schema não admite
 * grupo degenerado, e insistir nele faz o ProseMirror recriar a coluna.
 *
 * `extra` é conteúdo resgatado de um filho removido: ele sai do grupo, mas não
 * é destruído.
 */
export function writeGroupRemainderInTr(
  tr: Transaction,
  spec: GroupSpec,
  groupNode: PMNode,
  range: { from: number; to: number },
  remaining: PMNode[],
  extra: PMNode[] = []
): void {
  if (remaining.length <= 1) {
    const content = [...remaining.flatMap((child) => spec.childContent(child)), ...extra];
    if (content.length === 0) tr.delete(range.from, range.to);
    else tr.replaceWith(range.from, range.to, Fragment.fromArray(content));
    return;
  }

  tr.replaceWith(
    range.from,
    range.to,
    groupNode.type.create(groupNode.attrs, rebalance(spec, remaining))
  );

  if (extra.length > 0) {
    // Bias +1: com o padrão (-1) o fim do grupo mapeia de volta para dentro
    // dele, e o conteúdo resgatado voltaria para o grupo de onde saiu.
    tr.insert(tr.mapping.map(range.to, 1), Fragment.fromArray(extra));
  }
}

// ─── Larguras ─────────────────────────────────────────────────────────────────

/** Grava as larguras dos filhos numa única transação. */
export function setChildWidths(view: EditorView, groupPos: number, widths: number[]): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group) return false;

  const { spec, node } = group;
  const tr = view.state.tr;
  const positions = getChildPositions(groupPos, node);

  getChildren(node).forEach((child, index) => {
    const next = widths[index];
    if (typeof next !== 'number' || !Number.isFinite(next)) return;
    if (round1(next) === round1(readWidth(spec, child))) return;
    tr.setNodeMarkup(positions[index], undefined, {
      ...child.attrs,
      [spec.widthAttr]: round1(next),
    });
  });

  if (!tr.docChanged) return false;
  view.dispatch(tr);
  return true;
}

export function balanceChildren(view: EditorView, groupPos: number): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group || group.node.childCount === 0) return false;
  return setChildWidths(view, groupPos, new Array(group.node.childCount).fill(100 / group.node.childCount));
}

// ─── Entrada de conteúdo ──────────────────────────────────────────────────────

/**
 * De onde sai o conteúdo que está entrando no grupo.
 *
 * Num arrasto isto é uma `Selection` — a mesma que o `prosemirror-view` usa
 * para remover a origem no handler de drop dele:
 *
 *     if (move) { const { node } = dragging;
 *                 if (node) node.replace(tr); else tr.deleteSelection(); }
 *
 * Repare que num arrasto de node view a seleção do DOCUMENTO não é atualizada:
 * o `dragstart` do ProseMirror monta a `NodeSelection` e a guarda em
 * `dragging.node` sem despachá-la. Quem resolve qual das duas vale é o
 * `DragToGroup`; aqui só se aplica a que chegou. Nenhuma posição é
 * reconstruída em lugar nenhum.
 */
export type GroupContentSource = { from: number; to: number } | Selection | null | undefined;

/** Remove a origem e devolve o índice do passo a partir do qual remapear. */
function removeSource(tr: Transaction, source: GroupContentSource): number {
  const base = tr.steps.length;
  // `Selection` primeiro: ela também tem `from`/`to`, e a faixa crua é o outro caso.
  if (source instanceof Selection) source.replace(tr);
  else if (source && source.to > source.from) tr.delete(source.from, source.to);
  return base;
}

/** Cria um grupo envolvendo o node em `targetPos` e o conteúdo solto. */
export function createGroupInTr(
  tr: Transaction,
  spec: GroupSpec,
  targetPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const schema = tr.doc.type.schema;
  const groupType = schema.nodes[spec.groupName];
  if (!groupType) return false;

  const expected = safeNodeAt(tr.doc, targetPos);
  if (!expected) return false;

  const base = removeSource(tr, source);

  // `slice(base)` mapeia só pelos passos desta operação, para funcionar também
  // quando a transação já vinha com passos de outra.
  const pos = tr.mapping.slice(base).map(targetPos, -1);
  const target = safeNodeAt(tr.doc, pos);
  if (!target) return false;

  /*
   * Se a posição remapeada passou a apontar para outro TIPO, o mapeamento
   * escorregou e envolver esse node agruparia o bloco errado. A comparação é
   * por tipo, e não por `eq`: quando a origem removida estava dentro do alvo
   * (arrastar um bloco de dentro do grupo para a borda dele) o conteúdo muda de
   * forma legítima, e `eq` rejeitaria a operação.
   */
  if (target.type !== expected.type) return false;

  const droppedChild = spec.wrapAsChild(schema, dropped, 50);
  const targetChild = spec.wrapAsChild(schema, [target], 50);
  if (!droppedChild || !targetChild) return false;

  try {
    const group = groupType.create(
      null,
      side === 'left' ? [droppedChild, targetChild] : [targetChild, droppedChild]
    );
    tr.replaceWith(pos, pos + target.nodeSize, group);
  } catch (err) {
    console.warn(`[group-layout] Não foi possível criar ${spec.groupName}:`, err);
    return false;
  }

  return tr.docChanged;
}

/** Acrescenta uma coluna a um grupo existente, redistribuindo as larguras. */
export function appendToGroupInTr(
  tr: Transaction,
  groupPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const initial = safeNodeAt(tr.doc, groupPos);
  const spec = initial ? getSpecForGroup(initial) : null;
  if (!spec) return false;

  const base = removeSource(tr, source);

  const pos = tr.mapping.slice(base).map(groupPos, -1);
  const group = safeNodeAt(tr.doc, pos);
  if (!group || group.type.name !== spec.groupName) return false;
  if (group.childCount >= spec.maxChildren) return false;

  const newChild = spec.wrapAsChild(tr.doc.type.schema, dropped, spec.defaultWidth);
  if (!newChild) return false;

  const children = getChildren(group);
  const next = side === 'left' ? [newChild, ...children] : [...children, newChild];

  try {
    tr.replaceWith(pos, pos + group.nodeSize, group.type.create(group.attrs, rebalance(spec, next)));
  } catch (err) {
    console.warn(`[group-layout] Não foi possível expandir ${spec.groupName}:`, err);
    return false;
  }

  return tr.docChanged;
}

function dispatchIfChanged(view: EditorView, tr: Transaction, changed: boolean): boolean {
  if (!changed || !tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

export function createGroup(
  view: EditorView,
  spec: GroupSpec,
  targetPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const tr = view.state.tr;
  return dispatchIfChanged(view, tr, createGroupInTr(tr, spec, targetPos, dropped, side, source));
}

export function appendToGroup(
  view: EditorView,
  groupPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  source?: GroupContentSource
): boolean {
  const tr = view.state.tr;
  return dispatchIfChanged(view, tr, appendToGroupInTr(tr, groupPos, dropped, side, source));
}

/**
 * Agrupa dois nodes irmãos já existentes (botões "agrupar com o vizinho").
 * `pos` é o node âncora; procura o irmão seguinte e, se não houver, o anterior.
 */
export function groupWithSibling(view: EditorView, spec: GroupSpec, pos: number): boolean {
  const { state } = view;
  const node = state.doc.nodeAt(pos);
  if (!node) return false;

  const range = { from: pos, to: pos + node.nodeSize };

  const after = state.doc.resolve(range.to).nodeAfter;
  if (after && spec.acceptsContent([after])) {
    return createGroup(view, spec, range.to, [node], 'left', range);
  }

  const before = state.doc.resolve(pos).nodeBefore;
  if (before && spec.acceptsContent([before])) {
    return createGroup(view, spec, pos - before.nodeSize, [node], 'right', range);
  }

  return false;
}

// ─── Saída de conteúdo ────────────────────────────────────────────────────────

/**
 * Desfaz o grupo: substitui-o pelo conteúdo de todos os filhos, empilhado.
 * É a saída de emergência — sem ela o schema recria qualquer coluna que o
 * usuário tente apagar, e não há como voltar ao layout normal.
 */
export function unwrapGroup(view: EditorView, groupPos: number): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group) return false;

  const content = flattenGroup(group.spec, group.node);
  const tr = view.state.tr;
  const end = groupPos + group.node.nodeSize;

  if (content.length === 0) tr.delete(groupPos, end);
  else tr.replaceWith(groupPos, end, Fragment.fromArray(content));

  return dispatchIfChanged(view, tr, true);
}

/**
 * Remove um filho do grupo. Por padrão o conteúdo não é destruído: ele é
 * reinserido logo depois do grupo. Se sobrar um filho só, o grupo é desfeito.
 */
export function removeChild(
  view: EditorView,
  groupPos: number,
  index: number,
  options: { keepContent?: boolean } = {}
): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group) return false;

  const { spec, node } = group;
  const children = getChildren(node);
  if (index < 0 || index >= children.length) return false;

  const remaining = children.filter((_, i) => i !== index);
  const rescued = (options.keepContent ?? true) ? spec.childContent(children[index]) : [];

  const tr = view.state.tr;
  const range = { from: groupPos, to: groupPos + node.nodeSize };
  writeGroupRemainderInTr(tr, spec, node, range, remaining, rescued);

  return dispatchIfChanged(view, tr, true);
}

/**
 * Troca uma coluna de lugar dentro do grupo.
 *
 * Não passa pelo arrasto de propósito: o `dragover` do `DragToGroup` só
 * reconhece blocos de nível superior, e uma coluna nunca é um deles. A largura
 * viaja junto com a coluna — reordenar não redimensiona.
 */
export function moveChild(view: EditorView, groupPos: number, from: number, to: number): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group) return false;

  const children = getChildren(group.node);
  if (from === to) return false;
  if (from < 0 || from >= children.length || to < 0 || to >= children.length) return false;

  const reordered = children.slice();
  reordered.splice(to, 0, ...reordered.splice(from, 1));

  const tr = view.state.tr;
  try {
    tr.replaceWith(
      groupPos,
      groupPos + group.node.nodeSize,
      group.node.type.create(group.node.attrs, reordered)
    );
  } catch (err) {
    console.warn('[group-layout] Não foi possível reordenar a coluna:', err);
    return false;
  }

  return dispatchIfChanged(view, tr, true);
}

// ─── Limpeza ──────────────────────────────────────────────────────────────────

/** Índice de um filho dentro do grupo pai, a partir da posição do filho. */
export function findChildIndex(
  doc: PMNode,
  childPos: number
): { groupPos: number; index: number } | null {
  let $pos;
  try {
    $pos = doc.resolve(childPos);
  } catch {
    return null;
  }
  if ($pos.depth === 0) return null;
  if (!getSpecForGroup($pos.parent)) return null;

  return { groupPos: $pos.before($pos.depth), index: $pos.index($pos.depth) };
}

/**
 * Desfaz grupos degenerados (menos de dois filhos) e grupos aninhados dentro de
 * outros, numa transação já em andamento.
 */
export function pruneGroupsInTransaction(tr: Transaction, doc: PMNode, spec?: GroupSpec): boolean {
  let changed = false;
  const targets: Array<{ pos: number; node: PMNode }> = [];

  // Desce a árvore inteira: o schema não impede um grupo dentro de uma coluna.
  doc.descendants((node, pos) => {
    const nodeSpec = getSpecForGroup(node);
    if (!nodeSpec) return true;
    if (spec && nodeSpec !== spec) return false;
    targets.push({ pos, node });
    return true;
  });

  const contains = (outer: { pos: number; node: PMNode }, innerPos: number) =>
    innerPos > outer.pos && innerPos < outer.pos + outer.node.nodeSize;

  // De trás para frente, para não invalidar as posições anteriores.
  for (const target of targets.slice().reverse()) {
    const { pos, node } = target;
    const nodeSpec = getSpecForGroup(node)!;

    /*
     * Um grupo que contém outro alvo fica para a próxima passada: `node` é um
     * retrato de antes da transação, e desfazê-lo agora reinseriria o conteúdo
     * antigo, ressuscitando o grupo interno recém-desfeito. O `appendTransaction`
     * reentra (MAX_CASCADE), então o de fora é tratado no ciclo seguinte.
     */
    if (targets.some((other) => other !== target && contains(target, other.pos))) continue;

    const nested = targets.some((other) => other !== target && contains(other, pos));
    if (node.childCount >= 2 && !nested) continue;

    // As DUAS pontas são remapeadas: calcular o fim como `início + nodeSize`
    // usaria o tamanho de antes da transação e erraria a faixa.
    const from = tr.mapping.map(pos, -1);
    const to = tr.mapping.map(pos + node.nodeSize, 1);
    const content = flattenGroup(nodeSpec, node);

    if (content.length === 0) tr.delete(from, to);
    else tr.replaceWith(from, to, Fragment.fromArray(content));
    changed = true;
  }

  return changed;
}
