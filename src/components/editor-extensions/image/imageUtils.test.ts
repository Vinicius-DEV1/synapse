/**
 * imageUtils.test.ts
 *
 * `moveBlockNode` é o Alt+↑/Alt+↓ e os botões "mover" da barra de imagem.
 * A conta do destino é assimétrica — para cima o irmão começa em
 * `from - sibling.nodeSize`, para baixo ele TERMINA em `to + sibling.nodeSize` —
 * e é fácil escrever uma e repetir para a outra.
 */

import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import { moveBlockNode } from './imageUtils';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
});

const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));

/** `moveBlockNode` só usa `editor.view.state` e `editor.view.dispatch`. */
function fakeEditor(...nodes: PMNode[]) {
  let state = EditorState.create({ doc: schema.nodes.doc.create(null, nodes) });
  const editor = {
    view: {
      get state() {
        return state;
      },
      dispatch: (tr: ReturnType<typeof state.tr.scrollIntoView>) => {
        state = state.apply(tr);
      },
    },
  } as unknown as Editor;
  return { editor, doc: () => state.doc };
}

const texts = (doc: PMNode) => {
  const out: string[] = [];
  doc.forEach((node) => out.push(node.textContent));
  return out;
};

describe('moveBlockNode', () => {
  it('move um bloco para baixo passando pelo irmão MAIOR', () => {
    // O caso que a conta errada quebrava: com o irmão maior que o node movido,
    // o destino caía DENTRO do conteúdo dele.
    const { editor, doc } = fakeEditor(p('A'), p('BBBBBB'), p('C'));

    expect(moveBlockNode(editor, 0, 1)).toBe(true);
    expect(texts(doc())).toEqual(['BBBBBB', 'A', 'C']);
  });

  it('move um bloco para baixo passando pelo irmão MENOR', () => {
    const { editor, doc } = fakeEditor(p('AAAAAA'), p('B'), p('C'));

    expect(moveBlockNode(editor, 0, 1)).toBe(true);
    expect(texts(doc())).toEqual(['B', 'AAAAAA', 'C']);
  });

  it('move um bloco para cima', () => {
    const { editor, doc } = fakeEditor(p('A'), p('BBBBBB'), p('C'));

    expect(moveBlockNode(editor, 3, -1)).toBe(true);
    expect(texts(doc())).toEqual(['BBBBBB', 'A', 'C']);
  });

  it('não faz nada no primeiro bloco para cima nem no último para baixo', () => {
    const { editor, doc } = fakeEditor(p('A'), p('B'));

    expect(moveBlockNode(editor, 0, -1)).toBe(false);
    expect(moveBlockNode(editor, 3, 1)).toBe(false);
    expect(texts(doc())).toEqual(['A', 'B']);
  });

  it('preserva todo o conteúdo — mover nunca duplica nem perde', () => {
    const { editor, doc } = fakeEditor(p('A'), p('BBBBBB'), p('C'), p('D'));

    moveBlockNode(editor, 0, 1);
    expect(texts(doc()).slice().sort()).toEqual(['A', 'BBBBBB', 'C', 'D']);
  });
});
