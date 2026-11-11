/**
 * linkGroupPhantom.test.ts
 *
 * O card fantasma — a causa do "movi e às vezes duplicou".
 *
 * `linkGroup` é `linkPreview{2,4}`. Ao tirar um card de um grupo de DOIS, sobra
 * um, e o ProseMirror preenche o mínimo do schema com um `linkPreview` em
 * branco para manter o documento válido. Como `linkPreview` é atom, o
 * auto-colapso não reconhecia esse fantasma: o grupo tinha dois filhos e
 * parecia saudável.
 *
 * A intermitência vinha daí — com três cards ou mais, remover um deixa dois, o
 * schema fica satisfeito e nada é inventado.
 */

import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection } from '@tiptap/pm/state';
import { LINK_GROUP_SPEC } from './groupSpecs';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
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

const card = (url: string) => schema.nodes.linkPreview.create({ url });
const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));

describe('card fantasma do linkGroup', () => {
  it('o ProseMirror inventa um card em branco ao esvaziar um grupo de dois', () => {
    // Este teste documenta o comportamento do ProseMirror, não o nosso: se ele
    // mudar, a correção do `isEmptyChild` deixa de ser necessária.
    const grupo = schema.nodes.linkGroup.create(null, [card('https://a.com'), card('https://b.com')]);
    const state = EditorState.create({ doc: schema.nodes.doc.create(null, [grupo, p('fim')]) });

    // Remove o primeiro card, como faria um arrasto para fora.
    const tr = state.tr.setSelection(NodeSelection.create(state.doc, 1));
    tr.deleteSelection();
    const doc = state.apply(tr).doc;

    const cards: string[] = [];
    doc.descendants((node) => {
      if (node.type.name === 'linkPreview') cards.push(node.attrs.url);
      return true;
    });

    // Dois cards de novo — e um deles é o fantasma, sem URL.
    expect(cards).toHaveLength(2);
    expect(cards.filter((url) => url === '')).toHaveLength(1);
  });

  it('isEmptyChild reconhece o card sem URL', () => {
    expect(LINK_GROUP_SPEC.isEmptyChild(card(''))).toBe(true);
    expect(LINK_GROUP_SPEC.isEmptyChild(card('   '))).toBe(true);
  });

  it('isEmptyChild não toca num card de verdade', () => {
    expect(LINK_GROUP_SPEC.isEmptyChild(card('https://exemplo.com'))).toBe(false);
  });

  it('cards de link não são protegidos pela seleção do auto-colapso', () => {
    // Um card em branco é lixo do schema, nunca uma edição em andamento — por
    // isso o `editableChildren: false`. Numa coluna de texto é o contrário.
    expect(LINK_GROUP_SPEC.editableChildren).toBe(false);
  });
});
