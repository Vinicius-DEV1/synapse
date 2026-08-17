/**
 * groupCommands.ts
 *
 * Operações de documento sobre grupos lado a lado — sem React, sem DOM.
 * Todas revalidam a posição antes de despachar e nunca usam tamanhos de node
 * calculados antes de uma edição (era exatamente esse o bug do arrasto de
 * colunas e do "desagrupar" dos cards de link).
 */

import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import type { Transaction } from '@tiptap/pm/state';
import type { GroupSpec } from './groupSpecs';
import { getSpecForGroup } from './groupSpecs';

export interface GroupRef {
  spec: GroupSpec;
  pos: number;
  node: PMNode;
}

/** Localiza o grupo em `pos`, garantindo que ele ainda existe e é do tipo esperado. */
export function resolveGroup(view: EditorView, pos: number | null | undefined): GroupRef | null {
  if (typeof pos !== 'number' || pos < 0) return null;
  const node = view.state.doc.nodeAt(pos);
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

const round1 = (value: number) => Math.round(value * 10) / 10;

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

/** Distribui as larguras igualmente entre os filhos. */
export function balanceChildren(view: EditorView, groupPos: number): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group) return false;
  const count = group.node.childCount;
  if (count === 0) return false;
  return setChildWidths(view, groupPos, new Array(count).fill(100 / count));
}

/** Conteúdo do grupo achatado, na ordem das colunas. */
export function flattenGroup(spec: GroupSpec, groupNode: PMNode): PMNode[] {
  return getChildren(groupNode).flatMap((child) => spec.childContent(child));
}

/**
 * Desfaz o grupo: substitui-o pelo conteúdo de todos os filhos, empilhado.
 * É a saída de emergência — sem ela o schema (`{2,5}`) recria qualquer coluna
 * que o usuário tente apagar, e não há como voltar ao layout normal.
 */
export function unwrapGroup(view: EditorView, groupPos: number): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group) return false;

  const content = flattenGroup(group.spec, group.node);
  const tr = view.state.tr;

  if (content.length === 0) {
    tr.delete(groupPos, groupPos + group.node.nodeSize);
  } else {
    tr.replaceWith(groupPos, groupPos + group.node.nodeSize, Fragment.fromArray(content));
  }

  if (!tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Remove um filho do grupo.
 * Por padrão o conteúdo não é destruído: ele é reinserido logo depois do grupo.
 * Se sobrar apenas um filho, o grupo inteiro é desfeito.
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

  const keepContent = options.keepContent ?? true;
  const remaining = children.filter((_, i) => i !== index);
  const rescued = keepContent ? spec.childContent(children[index]) : [];

  const tr = view.state.tr;
  const groupEnd = groupPos + node.nodeSize;

  if (remaining.length <= 1) {
    // Grupo degenerado: desfaz tudo, mantendo a ordem visual.
    const flattened = remaining.flatMap((child) => spec.childContent(child));
    const replacement = [...flattened, ...rescued];
    if (replacement.length === 0) {
      tr.delete(groupPos, groupEnd);
    } else {
      tr.replaceWith(groupPos, groupEnd, Fragment.fromArray(replacement));
    }
  } else {
    const width = 100 / remaining.length;
    const rebalanced = remaining.map((child) =>
      child.type.create({ ...child.attrs, [spec.widthAttr]: round1(width) }, child.content, child.marks)
    );
    tr.replaceWith(groupPos, groupEnd, node.type.create(node.attrs, rebalanced));
    if (rescued.length > 0) {
      tr.insert(tr.mapping.map(groupEnd), Fragment.fromArray(rescued));
    }
  }

  if (!tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Troca uma coluna de lugar dentro do grupo.
 *
 * Não passa pelo arrasto de propósito: o `dragover` do `DragToGroup` só
 * reconhece blocos de NÍVEL SUPERIOR, e uma coluna nunca é um deles — arrastar
 * colunas por ali exigiria um segundo sistema de alvos, com a mesma matemática
 * de bordas que já é a parte frágil. Aqui a operação é determinística.
 *
 * A largura viaja junto com a coluna, que é o esperado: reordenar não
 * redimensiona.
 */
export function moveChild(view: EditorView, groupPos: number, from: number, to: number): boolean {
  const group = resolveGroup(view, groupPos);
  if (!group) return false;

  const children = getChildren(group.node);
  if (from === to) return false;
  if (from < 0 || from >= children.length) return false;
  if (to < 0 || to >= children.length) return false;

  const reordered = children.slice();
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

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

  if (!tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Cria um grupo a partir de dois conjuntos de conteúdo, substituindo o node em
 * `targetPos`. `removeRange` é a faixa de origem num arrasto do tipo "mover".
 */
export function createGroup(
  view: EditorView,
  spec: GroupSpec,
  targetPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  removeRange?: { from: number; to: number } | null
): boolean {
  const schema = view.state.schema;
  const groupType = schema.nodes[spec.groupName];
  if (!groupType) return false;

  const expected = view.state.doc.nodeAt(targetPos);

  const tr = view.state.tr;
  if (removeRange && removeRange.to > removeRange.from) {
    tr.delete(removeRange.from, removeRange.to);
  }

  // A posição alvo é remapeada DEPOIS da exclusão, e o tamanho do node é lido
  // de novo — usar o tamanho antigo corrompia o documento.
  const pos = tr.mapping.map(targetPos, -1);
  const target = tr.doc.nodeAt(pos);
  if (!target) return false;

  // Havia um node ali antes; se agora a posição remapeada aponta para outro
  // TIPO, o mapeamento escorregou e envolver esse node significaria agrupar o
  // bloco errado. Comparar por tipo e não por `eq`: quando a origem removida
  // estava DENTRO do alvo (arrastar um bloco de dentro do grupo para a borda
  // dele), o conteúdo muda de forma legítima e `eq` rejeitaria a operação.
  if (expected && target.type !== expected.type) return false;

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

  if (!tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

/** Acrescenta uma coluna a um grupo existente, redistribuindo as larguras. */
export function appendToGroup(
  view: EditorView,
  groupPos: number,
  dropped: PMNode[],
  side: 'left' | 'right',
  removeRange?: { from: number; to: number } | null
): boolean {
  const initial = resolveGroup(view, groupPos);
  if (!initial) return false;

  const { spec } = initial;
  const tr = view.state.tr;
  if (removeRange && removeRange.to > removeRange.from) {
    tr.delete(removeRange.from, removeRange.to);
  }

  const pos = tr.mapping.map(groupPos, -1);
  const group = tr.doc.nodeAt(pos);
  if (!group || group.type.name !== spec.groupName) return false;
  if (group.childCount >= spec.maxChildren) return false;

  const newChild = spec.wrapAsChild(view.state.schema, dropped, spec.defaultWidth);
  if (!newChild) return false;

  const children = getChildren(group);
  const next = side === 'left' ? [newChild, ...children] : [...children, newChild];
  const width = round1(100 / next.length);

  try {
    const rebalanced = next.map((child) =>
      child.type.create({ ...child.attrs, [spec.widthAttr]: width }, child.content, child.marks)
    );
    tr.replaceWith(pos, pos + group.nodeSize, group.type.create(group.attrs, rebalanced));
  } catch (err) {
    console.warn(`[group-layout] Não foi possível expandir ${spec.groupName}:`, err);
    return false;
  }

  if (!tr.docChanged) return false;
  view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Agrupa dois nodes irmãos já existentes (usado pelos botões "agrupar com o
 * vizinho"). `pos` é o node âncora; procura o irmão seguinte e, se não houver,
 * o anterior.
 */
export function groupWithSibling(view: EditorView, spec: GroupSpec, pos: number): boolean {
  const { state } = view;
  const node = state.doc.nodeAt(pos);
  if (!node) return false;

  const after = state.doc.resolve(pos + node.nodeSize).nodeAfter;
  if (after && spec.acceptsContent([after])) {
    return createGroup(view, spec, pos + node.nodeSize, [node], 'left', {
      from: pos,
      to: pos + node.nodeSize,
    });
  }

  const before = state.doc.resolve(pos).nodeBefore;
  if (before && spec.acceptsContent([before])) {
    const beforePos = pos - before.nodeSize;
    return createGroup(view, spec, beforePos, [node], 'right', {
      from: pos,
      to: pos + node.nodeSize,
    });
  }

  return false;
}

/** Índice de um filho dentro do grupo pai, a partir da posição do filho. */
export function findChildIndex(doc: PMNode, childPos: number): { groupPos: number; index: number } | null {
  let $pos;
  try {
    $pos = doc.resolve(childPos);
  } catch {
    return null;
  }
  if ($pos.depth === 0) return null;

  const parent = $pos.parent;
  if (!getSpecForGroup(parent)) return null;

  return { groupPos: $pos.before($pos.depth), index: $pos.index($pos.depth) };
}

/** Aplica a limpeza de grupos degenerados numa transação já em andamento. */
export function pruneGroupsInTransaction(tr: Transaction, doc: PMNode, spec?: GroupSpec): boolean {
  let changed = false;
  const targets: Array<{ pos: number; node: PMNode }> = [];

  doc.descendants((node, pos) => {
    const nodeSpec = getSpecForGroup(node);
    if (!nodeSpec) return true;
    if (spec && nodeSpec !== spec) return false;
    targets.push({ pos, node });
    // Continua descendo. Antes parava aqui, alegando que "grupos não aninham" —
    // mas isso é uma regra que o schema NÃO impõe: `columnBlock` aceita `block+`
    // e os grupos são `group: 'block'`, então colar (ou usar o slash-menu) põe
    // um grupo dentro de uma coluna. O aninhado nunca era sequer visitado.
    return true;
  });

  /** Este alvo contém outro alvo? */
  const containsAnotherTarget = (candidate: { pos: number; node: PMNode }) =>
    targets.some(
      (other) =>
        other !== candidate &&
        other.pos > candidate.pos &&
        other.pos < candidate.pos + candidate.node.nodeSize
    );

  // De trás para frente para não invalidar as posições anteriores.
  for (const { pos, node } of targets.reverse()) {
    const nodeSpec = getSpecForGroup(node)!;

    /*
     * Um grupo que contém outro alvo é deixado para a próxima passada. O `node`
     * aqui é um retrato de antes da transação: desfazer o externo agora
     * reinseriria o conteúdo antigo, ressuscitando o grupo interno que acabamos
     * de desfazer. O `appendTransaction` reentra (MAX_CASCADE), então o de fora
     * é tratado no ciclo seguinte, já com o retrato atualizado.
     */
    if (containsAnotherTarget({ pos, node })) continue;

    // Desfaz se ficou degenerado OU se está aninhado dentro de outro grupo.
    const nested = targets.some(
      (other) => other.pos < pos && pos < other.pos + other.node.nodeSize
    );
    if (node.childCount >= 2 && !nested) continue;

    const content = flattenGroup(nodeSpec, node);
    // Mesmo cuidado do `groupAutoCollapse`: as duas pontas são remapeadas. O
    // fim era calculado como `mapped + node.nodeSize`, usando o tamanho de
    // antes da transação, e errava a faixa assim que houvesse mais de um grupo.
    const from = tr.mapping.map(pos, -1);
    const to = tr.mapping.map(pos + node.nodeSize, 1);
    if (content.length === 0) {
      tr.delete(from, to);
    } else {
      tr.replaceWith(from, to, Fragment.fromArray(content));
    }
    changed = true;
  }

  return changed;
}
