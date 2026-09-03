/**
 * dropIntegrity.test.ts
 *
 * As três promessas que soltar um bloco tem de cumprir, e que estavam sendo
 * quebradas de formas diferentes:
 *
 *   1. O bloco chega inteiro — mesmo tipo, mesmas marcas, mesmo texto.
 *   2. Nada nasce junto: o schema não pode inventar um card para completar
 *      `linkPreview{2,4}`.
 *   3. Quem fica selecionado no fim é o que foi movido, e não o vizinho.
 *
 * E a invariante que protege as três: uma operação que devolve `false` não
 * deixa rastro na transação.
 */

import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { EditorState, NodeSelection } from '@tiptap/pm/state';
import { applyGroupDropInTr } from './DragToGroup';
import { extractNodesFromSlice } from './dragContent';
import type { GroupDropTarget } from './DragToGroup';
import { appendToGroupInTr, createGroupInTr } from './groupCommands';
import { COLUMN_GROUP_SPEC, LINK_GROUP_SPEC } from './groupSpecs';

const schema = new Schema({
  marks: { bold: {} },
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    heading: { content: 'inline*', group: 'block', attrs: { level: { default: 1 } } },
    text: { group: 'inline' },
    // Um widget inline, como a referência de página e os cards de alarme/mídia.
    pageRef: { group: 'inline', inline: true, atom: true, attrs: { id: { default: 'x' } } },
    columnGroup: { content: 'columnBlock{1,5}', group: 'block', isolating: true },
    columnBlock: {
      content: 'block+',
      group: 'column',
      attrs: { width: { default: 50 } },
      isolating: true,
    },
    linkGroup: { content: 'linkPreview{2,4}', group: 'block', isolating: true },
    linkPreview: {
      group: 'block',
      atom: true,
      selectable: true,
      draggable: true,
      attrs: { url: { default: '' }, width: { default: 50 } },
    },
  },
});

const p = (text: string) => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
const card = (url: string) => schema.nodes.linkPreview.create({ url });
const linkGroup = (...cards: PMNode[]) => schema.nodes.linkGroup.create(null, cards);
const columnGroup = (...cols: PMNode[]) => schema.nodes.columnGroup.create(null, cols);
const column = (...children: PMNode[]) => schema.nodes.columnBlock.create(null, children);
const stateWith = (...nodes: PMNode[]) =>
  EditorState.create({ doc: schema.nodes.doc.create(null, nodes) });

/** Estrutura resumida: nome do node, conteúdo dos textblocks, URL dos cards. */
function shape(node: PMNode): string {
  if (node.isTextblock) return `${node.type.name}(${node.textContent})`;
  if (node.type.name === 'linkPreview') return `card(${node.attrs.url || 'EM-BRANCO'})`;
  const children: string[] = [];
  node.forEach((child) => children.push(shape(child)));
  return `${node.type.name}(${children.join(',')})`;
}

/** Solta `dragPos` sobre `targetPos`, como faria o `handleDrop`. */
function drop(state: EditorState, dragPos: number, target: GroupDropTarget) {
  const source = NodeSelection.create(state.doc, dragPos);
  const start = state.apply(state.tr.setSelection(source));
  const tr = start.tr;
  const ok = applyGroupDropInTr(tr, target, [start.doc.nodeAt(dragPos)!], source);
  return { ok, state: start.apply(tr) };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('o bloco arrastado chega inteiro', () => {
  it('um título continua um título', () => {
    // Antes, o extrator recolhia os filhos `isAtom` do textblock — e TEXTO é
    // átomo no ProseMirror. Sobrava o texto solto, que era reembrulhado em
    // `paragraph`: todo título arrastado para uma coluna virava parágrafo.
    const heading = schema.nodes.heading.create({ level: 2 }, schema.text('Meu Título'));
    const nodes = extractNodesFromSlice(NodeSelection.create(stateWith(heading, p('B')).doc, 0).content());

    expect(nodes).toHaveLength(1);
    expect(nodes[0].type.name).toBe('heading');
    expect(nodes[0].attrs.level).toBe(2);
    expect(nodes[0].textContent).toBe('Meu Título');
  });

  it('um parágrafo formatado não se parte num bloco por trecho de marca', () => {
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('Olá ', [schema.marks.bold.create()]),
      schema.text('mundo'),
    ]);
    const nodes = extractNodesFromSlice(NodeSelection.create(stateWith(paragraph, p('B')).doc, 0).content());

    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe('Olá mundo');
    expect(nodes[0].firstChild!.marks.map((mark) => mark.type.name)).toEqual(['bold']);
  });

  it('um parágrafo que só carrega um widget inline devolve o widget', () => {
    // O caso que a regra antiga existia para atender, e que continua valendo:
    // o parágrafo é embalagem, o que foi arrastado é o widget.
    const wrapper = schema.nodes.paragraph.create(null, schema.nodes.pageRef.create({ id: 'p1' }));
    const nodes = extractNodesFromSlice(NodeSelection.create(stateWith(wrapper, p('B')).doc, 0).content());

    expect(nodes).toHaveLength(1);
    expect(nodes[0].type.name).toBe('pageRef');
  });

  it('texto ao redor de um widget não é descartado', () => {
    // Aqui o parágrafo NÃO é embalagem: jogar fora o texto para ficar com o
    // widget apagava o que o usuário escreveu em volta dele.
    const mixed = schema.nodes.paragraph.create(null, [
      schema.text('veja '),
      schema.nodes.pageRef.create({ id: 'p1' }),
      schema.text(' aqui'),
    ]);
    const nodes = extractNodesFromSlice(NodeSelection.create(stateWith(mixed, p('B')).doc, 0).content());

    expect(nodes).toHaveLength(1);
    expect(nodes[0].type.name).toBe('paragraph');
    expect(nodes[0].textContent).toBe('veja  aqui');
  });
});

describe('o schema não inventa um card ao esvaziar o grupo', () => {
  const target = (pos: number): GroupDropTarget => ({
    pos,
    side: 'right',
    mode: 'create',
    spec: COLUMN_GROUP_SPEC,
    typeName: 'paragraph',
  });

  it('tirar um card de um grupo de DOIS não deixa card em branco', () => {
    /*
     * `linkGroup` é `linkPreview{2,4}`. Apagando um card de um grupo de dois, o
     * ProseMirror recompõe o mínimo do schema com um card em branco — e era
     * esse fantasma que aparecia na tela como \"movi e duplicou\". Agora o resto
     * do grupo é escrito à mão, na MESMA transação: nada a limpar depois.
     */
    const group = linkGroup(card('https://a.com'), card('https://b.com'));
    const { ok, state } = drop(stateWith(group, p('texto')), 1, target(group.nodeSize));

    expect(ok).toBe(true);
    expect(shape(state.doc)).toBe(
      'doc(card(https://b.com),columnGroup(columnBlock(paragraph(texto)),columnBlock(card(https://a.com))))'
    );
  });

  it('num grupo de TRÊS o que sobra continua um grupo, reequilibrado', () => {
    const group = linkGroup(card('a'), card('b'), card('c'));
    const { ok, state } = drop(stateWith(group, p('texto')), 1, target(group.nodeSize));

    expect(ok).toBe(true);
    expect(shape(state.doc.firstChild!)).toBe('linkGroup(card(b),card(c))');

    const widths: number[] = [];
    state.doc.firstChild!.forEach((child) => widths.push(child.attrs.width));
    expect(widths).toEqual([50, 50]);
  });

  it('nenhum card sem URL sobrevive à operação', () => {
    const group = linkGroup(card('https://a.com'), card('https://b.com'));
    const { state } = drop(stateWith(group, p('texto')), 1, target(group.nodeSize));

    const urls: string[] = [];
    state.doc.descendants((node) => {
      if (node.type.name === 'linkPreview') urls.push(node.attrs.url);
      return true;
    });
    expect(urls).toEqual(['https://b.com', 'https://a.com']);
  });
});

describe('quem fica selecionado é o que foi movido', () => {
  /*
   * `Selection.replace` chama `selectionToInsertionEnd`, que ancora a seleção
   * no BURACO deixado pela origem. Depois do agrupamento esse buraco pertence
   * ao bloco vizinho — era ele que acendia, e o usuário terminava com o card
   * errado (às vezes com dois) selecionado.
   */
  it('o card movido para fora do grupo é o selecionado, não o que ficou', () => {
    const group = linkGroup(card('https://movido.com'), card('https://ficou.com'));
    const { state } = drop(stateWith(group, p('texto')), 1, {
      pos: group.nodeSize,
      side: 'right',
      mode: 'create',
      spec: COLUMN_GROUP_SPEC,
      typeName: 'paragraph',
    });

    expect(state.selection).toBeInstanceOf(NodeSelection);
    expect((state.selection as NodeSelection).node.attrs.url).toBe('https://movido.com');
  });

  it('ao agrupar dois cards, o selecionado é o que veio no arrasto', () => {
    const { state } = drop(stateWith(card('https://movido.com'), card('https://alvo.com'), p('fim')), 0, {
      pos: 1,
      side: 'left',
      mode: 'create',
      spec: LINK_GROUP_SPEC,
      typeName: 'linkPreview',
    });

    expect(shape(state.doc.firstChild!)).toBe('linkGroup(card(https://movido.com),card(https://alvo.com))');
    expect((state.selection as NodeSelection).node.attrs.url).toBe('https://movido.com');
  });

  it('num grupo de colunas o cursor entra no bloco movido', () => {
    // Coluna tem conteúdo editável: o certo é o cursor lá dentro, como no
    // \"mover\" comum do ProseMirror — e não a coluna inteira acesa.
    const movido = p('movido');
    const { state } = drop(stateWith(movido, p('alvo')), 0, {
      pos: movido.nodeSize,
      side: 'left',
      mode: 'create',
      spec: COLUMN_GROUP_SPEC,
      typeName: 'paragraph',
    });

    expect(state.selection.empty).toBe(true);
    expect(state.selection.$from.parent.textContent).toBe('movido');
  });

  it('a coluna acrescentada a um grupo existente também recebe o cursor', () => {
    const group = columnGroup(column(p('A')), column(p('B')));
    const { state } = drop(stateWith(group, p('movido')), group.nodeSize, {
      pos: 0,
      side: 'right',
      mode: 'append',
      spec: COLUMN_GROUP_SPEC,
      typeName: 'columnGroup',
    });

    expect(state.selection.$from.parent.textContent).toBe('movido');
  });
});

describe('recusar nunca custa conteúdo', () => {
  /*
   * A ordem importa: a origem só pode ser removida depois de tudo que dá para
   * decidir sem tocar no documento. Recusando DEPOIS da remoção, a transação
   * fica com o bloco apagado e nada no lugar — quem a despachasse veria o
   * bloco simplesmente sumir.
   */
  it('um grupo de colunas cheio recusa sem apagar o bloco arrastado', () => {
    const group = columnGroup(column(p('1')), column(p('2')), column(p('3')), column(p('4')), column(p('5')));
    const state = stateWith(group, p('X'));
    const source = NodeSelection.create(state.doc, group.nodeSize);
    const tr = state.tr;

    expect(appendToGroupInTr(tr, 0, [state.doc.nodeAt(group.nodeSize)!], 'right', source)).toBe(false);
    expect(tr.docChanged).toBe(false);
    expect(tr.steps).toHaveLength(0);
  });

  it('um grupo de links cheio recusa sem apagar o card arrastado', () => {
    const group = linkGroup(card('a'), card('b'), card('c'), card('d'));
    const state = stateWith(group, card('e'));
    const source = NodeSelection.create(state.doc, group.nodeSize);
    const tr = state.tr;

    expect(appendToGroupInTr(tr, 0, [state.doc.nodeAt(group.nodeSize)!], 'right', source)).toBe(false);
    expect(tr.docChanged).toBe(false);
    expect(tr.steps).toHaveLength(0);
  });

  it('conteúdo que não cabe no grupo recusa antes de remover a origem', () => {
    // Um parágrafo não é `linkPreview`: `linkGroup` não tem onde pô-lo.
    const state = stateWith(card('a'), p('X'));
    const source = NodeSelection.create(state.doc, 1);
    const tr = state.tr;

    expect(createGroupInTr(tr, LINK_GROUP_SPEC, 0, [state.doc.nodeAt(1)!], 'left', source)).toBe(false);
    expect(tr.docChanged).toBe(false);
    expect(tr.steps).toHaveLength(0);
  });
});
