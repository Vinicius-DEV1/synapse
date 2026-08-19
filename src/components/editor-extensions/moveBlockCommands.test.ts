import { describe, it, expect, vi } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';

const testSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
    linkPreview: { group: 'block', atom: true, attrs: { url: { default: '' } } },
    linkGroup: { content: 'linkPreview+', group: 'block' },
  },
});

function createMockView(state: EditorState) {
  let currentState = state;
  return {
    get state() {
      return currentState;
    },
    dispatch: vi.fn((tr) => {
      currentState = currentState.apply(tr);
    }),
    focus: vi.fn(),
  } as any;
}

describe('moveBlockCommands', () => {
  it('moves second paragraph up before first paragraph', () => {
    const p1 = testSchema.nodes.paragraph.create(null, testSchema.text('First'));
    const p2 = testSchema.nodes.paragraph.create(null, testSchema.text('Second'));
    const doc = testSchema.nodes.doc.create(null, [p1, p2]);
    const state = EditorState.create({ doc, schema: testSchema });
    const view = createMockView(state);

    const posOfP2 = p1.nodeSize; // after p1
    const result = moveBlockUp(view, posOfP2);

    expect(result).toBe(true);
    expect(view.state.doc.child(0).textContent).toBe('Second');
    expect(view.state.doc.child(1).textContent).toBe('First');
  });

  it('moves first paragraph down after second paragraph', () => {
    const p1 = testSchema.nodes.paragraph.create(null, testSchema.text('First'));
    const p2 = testSchema.nodes.paragraph.create(null, testSchema.text('Second'));
    const doc = testSchema.nodes.doc.create(null, [p1, p2]);
    const state = EditorState.create({ doc, schema: testSchema });
    const view = createMockView(state);

    const posOfP1 = 0;
    const result = moveBlockDown(view, posOfP1);

    expect(result).toBe(true);
    expect(view.state.doc.child(0).textContent).toBe('Second');
    expect(view.state.doc.child(1).textContent).toBe('First');
  });

  it('returns false when trying to move first block up', () => {
    const p1 = testSchema.nodes.paragraph.create(null, testSchema.text('First'));
    const doc = testSchema.nodes.doc.create(null, [p1]);
    const state = EditorState.create({ doc, schema: testSchema });
    const view = createMockView(state);

    const result = moveBlockUp(view, 0);
    expect(result).toBe(false);
  });

  it('moves linkPreview inside group up', () => {
    const lp1 = testSchema.nodes.linkPreview.create({ url: 'https://a.com' });
    const lp2 = testSchema.nodes.linkPreview.create({ url: 'https://b.com' });
    const lg = testSchema.nodes.linkGroup.create(null, [lp1, lp2]);
    const doc = testSchema.nodes.doc.create(null, [lg]);
    const state = EditorState.create({ doc, schema: testSchema });
    const view = createMockView(state);

    const posOfLp2 = 1 + lp1.nodeSize;
    const result = moveBlockUp(view, posOfLp2);

    expect(result).toBe(true);
    const updatedGroup = view.state.doc.child(0);
    expect(updatedGroup.child(0).attrs.url).toBe('https://b.com');
    expect(updatedGroup.child(1).attrs.url).toBe('https://a.com');
  });

  it('moves first linkPreview out of group when moving up', () => {
    const lp1 = testSchema.nodes.linkPreview.create({ url: 'https://a.com' });
    const lp2 = testSchema.nodes.linkPreview.create({ url: 'https://b.com' });
    const lg = testSchema.nodes.linkGroup.create(null, [lp1, lp2]);
    const doc = testSchema.nodes.doc.create(null, [lg]);
    const state = EditorState.create({ doc, schema: testSchema });
    const view = createMockView(state);

    const posOfLp1 = 1;
    const result = moveBlockUp(view, posOfLp1);

    expect(result).toBe(true);
    // lp1 is now before the unwrapped remaining linkPreview
    expect(view.state.doc.child(0).type.name).toBe('linkPreview');
    expect(view.state.doc.child(0).attrs.url).toBe('https://a.com');
  });
});
