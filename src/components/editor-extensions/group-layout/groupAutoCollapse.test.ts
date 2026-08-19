import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { pruneGroupsInTransaction } from './groupCommands';

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
    linkGroup: { content: 'linkPreview{2,4}', group: 'block', isolating: true },
    linkPreview: {
      group: 'block',
      atom: true,
      attrs: { url: { default: '' }, width: { default: 50 } },
    },
  },
});

const p = (text: string) => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
const card = (url: string) => schema.nodes.linkPreview.create({ url });
const column = (...children: PMNode[]) => schema.nodes.columnBlock.create(null, children);
const columnGroup = (...cols: PMNode[]) => schema.nodes.columnGroup.create(null, cols);
const linkGroup = (...cards: PMNode[]) => schema.nodes.linkGroup.create(null, cards);

describe('groupAutoCollapse - pruneGroupsInTransaction', () => {
  it('unwraps degenerate columnGroup with only 1 column into direct blocks', () => {
    const doc = schema.nodes.doc.create(null, [
      columnGroup(column(p('Texto isolado'))),
      p('Outro parágrafo'),
    ]);

    const state = EditorState.create({ doc });
    const tr = state.tr;
    const changed = pruneGroupsInTransaction(tr, doc);

    expect(changed).toBe(true);
    expect(tr.doc.childCount).toBe(2);
    expect(tr.doc.child(0).type.name).toBe('paragraph');
    expect(tr.doc.child(0).textContent).toBe('Texto isolado');
    expect(tr.doc.child(1).textContent).toBe('Outro parágrafo');
  });

  it('unwraps degenerate linkGroup with only 1 card', () => {
    const doc = schema.nodes.doc.create(null, [
      linkGroup(card('https://caderno.app')),
      p('Fim'),
    ]);

    const state = EditorState.create({ doc });
    const tr = state.tr;
    const changed = pruneGroupsInTransaction(tr, doc);

    expect(changed).toBe(true);
    expect(tr.doc.child(0).type.name).toBe('linkPreview');
    expect(tr.doc.child(0).attrs.url).toBe('https://caderno.app');
  });

  it('keeps valid columnGroup with 2 or more columns untouched', () => {
    const doc = schema.nodes.doc.create(null, [
      columnGroup(column(p('Col 1')), column(p('Col 2'))),
    ]);

    const state = EditorState.create({ doc });
    const tr = state.tr;
    const changed = pruneGroupsInTransaction(tr, doc);

    expect(changed).toBe(false);
    expect(tr.doc.child(0).type.name).toBe('columnGroup');
    expect(tr.doc.child(0).childCount).toBe(2);
  });
});
