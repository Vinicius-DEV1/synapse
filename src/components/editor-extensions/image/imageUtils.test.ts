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
import { moveBlockNode, findNodePos, deleteImageAt } from './imageUtils';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    image: { group: 'block', atom: true, attrs: { src: { default: '' } } },
  },
});

const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));
const img = (src: string) => schema.nodes.image.create({ src });

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

  it('preserva a seleção ao mover bloco com NodeSelection', () => {
    const { editor } = fakeEditor(p('A'), img('test.png'), p('C'));
    // img começa em pos 3
    expect(moveBlockNode(editor, 3, -1)).toBe(true);
    // Deve mover img para a posição 0 e selecionar via NodeSelection
    expect(editor.view.state.selection.from).toBe(0);
    expect(editor.view.state.doc.child(0).type.name).toBe('image');
  });
});

describe('findNodePos and deleteImageAt', () => {
  it('localiza a imagem correta em hintPos mesmo quando a referência do objeto mudou', () => {
    const { doc } = fakeEditor(p('A'), img('https://example.com/pic.png'), p('B'));
    // img está na posição 3 (após p('A') que tem tamanho 3: 1 start + 1 'A' + 1 end)
    const originalImg = doc().nodeAt(3)!;
    // Cria uma nova instância de node (como acontece após transactions / re-renders)
    const recreatedImg = schema.nodes.image.create({ src: 'https://example.com/pic.png' });

    expect(findNodePos(doc(), recreatedImg, 3)).toBe(3);
  });

  it('não apaga a imagem errada quando há duas imagens IDÊNTICAS na página', () => {
    // Duas imagens com o mesmo src em posições diferentes:
    // p('A') -> pos 0 (size 3)
    // img1   -> pos 3 (size 1)
    // p('B') -> pos 4 (size 3)
    // img2   -> pos 7 (size 1)
    // p('C') -> pos 8 (size 3)
    const img1 = img('https://example.com/duplicate.png');
    const img2 = img('https://example.com/duplicate.png');
    const { editor, doc } = fakeEditor(p('A'), img1, p('B'), img2, p('C'));

    // Queremos apagar img2 que está em pos 7 (a segunda imagem)
    // Passamos um clone de img2 para simular o nó vindo de React props desatualizado
    const clonedImg2 = schema.nodes.image.create({ src: 'https://example.com/duplicate.png' });

    // findNodePos DEVE retornar pos 7 (a mais próxima de hintPos), JAMAIS pos 3!
    const targetPos = findNodePos(doc(), clonedImg2, 7);
    expect(targetPos).toBe(7);

    // Executa a exclusão de img2
    const deleted = deleteImageAt(editor, clonedImg2, 7);
    expect(deleted).toBe(true);

    // Verifica que a Imagem 1 (em pos 3) CONTINUA INTACTA no documento!
    const currentDoc = doc();
    expect(currentDoc.child(1).type.name).toBe('image');
    expect(currentDoc.child(1).attrs.src).toBe('https://example.com/duplicate.png');

    // E a Imagem 2 foi removida (o documento agora tem apenas 1 imagem e 3 parágrafos)
    let imageCount = 0;
    currentDoc.descendants((node) => {
      if (node.type.name === 'image') imageCount++;
    });
    expect(imageCount).toBe(1);
  });
});
