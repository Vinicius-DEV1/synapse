/**
 * groupDrop.test.ts
 *
 * O pipeline de soltar um bloco na borda de outro.
 *
 * O que estes testes protegem é uma invariante só, e é a que importa: soltar um
 * bloco NUNCA pode duplicar nem perder conteúdo. Toda a família de bugs antiga
 * ("duplicou o bloco", "apagou o node errado", "sumiu conteúdo de um lugar que
 * não toquei") era uma violação dela, causada por reconstruir a posição de
 * origem. Hoje a origem é a seleção e quem a remove é `tr.deleteSelection()`.
 */

import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { appendToGroupInTr, createGroupInTr } from './groupCommands';
import { COLUMN_GROUP_SPEC } from './groupSpecs';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    columnGroup: { content: 'columnBlock{1,5}', group: 'block', isolating: true },
    columnBlock: {
      content: 'block+',
      group: 'column',
      attrs: { width: { default: 50 } },
      isolating: true,
    },
  },
});

const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));
const column = (...children: PMNode[]) => schema.nodes.columnBlock.create(null, children);
const columnGroup = (...children: PMNode[]) => schema.nodes.columnGroup.create(null, children);

const stateWith = (...nodes: PMNode[]) =>
  EditorState.create({ doc: schema.nodes.doc.create(null, nodes) });

/** Todo o texto do documento, em ordem de leitura. */
function texts(doc: PMNode): string[] {
  const out: string[] = [];
  doc.descendants((node) => {
    if (node.isText && node.text) out.push(node.text);
  });
  return out;
}

/** Estrutura resumida: nome do node e seus filhos. */
function shape(node: PMNode): string {
  if (node.isTextblock) return node.textContent;
  const children: string[] = [];
  node.forEach((child) => children.push(shape(child)));
  return `${node.type.name}(${children.join(',')})`;
}

/**
 * Solta o node em `dragPos` na borda `side` do node em `targetPos`.
 *
 * `docSelectionElsewhere` reproduz o arrasto de um NODE VIEW: o `dragstart` do
 * ProseMirror monta a `NodeSelection` do node arrastado e a guarda em
 * `dragging.node` SEM despachá-la, então a seleção do documento continua onde
 * estava. É o caso em que confiar na seleção do documento duplicava o bloco.
 */
function drop(
  state: EditorState,
  dragPos: number,
  targetPos: number,
  side: 'left' | 'right',
  mode: 'create' | 'append' = 'create',
  docSelectionElsewhere = false
) {
  const dragged = state.doc.nodeAt(dragPos);
  if (!dragged) throw new Error(`nada em ${dragPos}`);

  // A seleção que o ProseMirror associa ao arrasto.
  const dragSelection = NodeSelection.create(state.doc, dragPos);

  const start = docSelectionElsewhere
    ? state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    : state.apply(state.tr.setSelection(dragSelection));

  const tr = start.tr;
  const ok =
    mode === 'append'
      ? appendToGroupInTr(tr, targetPos, [dragged], side, dragSelection)
      : createGroupInTr(tr, COLUMN_GROUP_SPEC, targetPos, [dragged], side, dragSelection);

  return { ok, doc: start.apply(tr).doc };
}

describe('soltar um bloco na borda de outro', () => {
  it('agrupa quando a origem vem ANTES do alvo', () => {
    const { ok, doc } = drop(stateWith(p('A'), p('B')), 0, 3, 'left');

    expect(ok).toBe(true);
    expect(shape(doc.firstChild!)).toBe('columnGroup(columnBlock(A),columnBlock(B))');
    expect(doc.childCount).toBe(1);
  });

  it('agrupa quando a origem vem DEPOIS do alvo', () => {
    // Aqui a remoção da origem não desloca o alvo; o mapeamento tem de aguentar
    // os dois sentidos.
    const { ok, doc } = drop(stateWith(p('A'), p('B')), 3, 0, 'right');

    expect(ok).toBe(true);
    expect(shape(doc.firstChild!)).toBe('columnGroup(columnBlock(A),columnBlock(B))');
    expect(doc.childCount).toBe(1);
  });

  it('não duplica nem perde conteúdo ao mover', () => {
    const before = stateWith(p('A'), p('B'), p('C'));
    const { doc } = drop(before, 0, 3, 'left');

    // A invariante central: o mesmo conteúdo, nem mais nem menos.
    expect(texts(doc).sort()).toEqual(['A', 'B', 'C']);
  });

  it('preserva os blocos vizinhos que não participam do agrupamento', () => {
    const { doc } = drop(stateWith(p('antes'), p('A'), p('B'), p('depois')), 7, 10, 'left');

    expect(shape(doc)).toBe('doc(antes,columnGroup(columnBlock(A),columnBlock(B)),depois)');
  });

  it('acrescenta uma coluna a um grupo existente sem duplicar a origem', () => {
    const group = columnGroup(column(p('A')), column(p('B')));
    const state = stateWith(group, p('C'));
    const { ok, doc } = drop(state, group.nodeSize, 0, 'right', 'append');

    expect(ok).toBe(true);
    expect(shape(doc)).toBe(
      'doc(columnGroup(columnBlock(A),columnBlock(B),columnBlock(C)))'
    );
    expect(texts(doc)).toEqual(['A', 'B', 'C']);
  });

  it('redistribui as larguras ao acrescentar uma coluna', () => {
    const group = columnGroup(column(p('A')), column(p('B')));
    const state = stateWith(group, p('C'));
    const { doc } = drop(state, group.nodeSize, 0, 'right', 'append');

    const widths: number[] = [];
    doc.firstChild!.forEach((child) => widths.push(child.attrs.width));
    expect(widths).toEqual([33.3, 33.3, 33.3]);
  });

  it('tira o bloco de dentro de uma coluna sem duplicá-lo', () => {
    // Arrastar conteúdo para FORA de um grupo: a origem está aninhada, que era
    // o caso em que a posição reconstruída apontava para o grupo inteiro.
    const group = columnGroup(column(p('A')), column(p('B')));
    const state = stateWith(group, p('C'));

    // p('A') está dentro da primeira coluna: grupo(1) + coluna(1) = 2.
    const { ok, doc } = drop(state, 2, group.nodeSize, 'left');

    expect(ok).toBe(true);
    expect(texts(doc).sort()).toEqual(['A', 'B', 'C']);
  });

  it('não duplica ao arrastar um NODE VIEW, cuja seleção o PM não despacha', () => {
    // A regressão: a seleção do documento está no primeiro parágrafo, e o node
    // arrastado é o segundo. Confiar na seleção do documento apagaria o bloco
    // errado (ou nenhum), e o arrastado reapareceria no destino sem sair da
    // origem — exatamente o "movi e duplicou".
    const { ok, doc } = drop(
      stateWith(p('A'), p('B'), p('C')),
      3, // p('B')
      6, // p('C')
      'left',
      'create',
      true // seleção do documento em outro lugar
    );

    expect(ok).toBe(true);
    expect(texts(doc).sort()).toEqual(['A', 'B', 'C']);
    expect(shape(doc)).toBe('doc(A,columnGroup(columnBlock(B),columnBlock(C)))');
  });

  it('num "copiar" (sem origem) o conteúdo solto não é removido de lugar nenhum', () => {
    const state = stateWith(p('B'));
    const tr = state.tr;
    const ok = createGroupInTr(tr, COLUMN_GROUP_SPEC, 0, [p('X')], 'left', null);

    expect(ok).toBe(true);
    expect(shape(state.apply(tr).doc.firstChild!)).toBe(
      'columnGroup(columnBlock(X),columnBlock(B))'
    );
  });

  it('recusa em vez de corromper quando o alvo já não existe', () => {
    const state = stateWith(p('A'), p('B'));
    const tr = state.tr;

    // Posição além do fim do documento.
    expect(createGroupInTr(tr, COLUMN_GROUP_SPEC, 999, [p('X')], 'left', null)).toBe(false);
    expect(tr.docChanged).toBe(false);
  });
});
