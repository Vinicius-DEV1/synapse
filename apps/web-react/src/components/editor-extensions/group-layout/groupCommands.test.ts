import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { getChildren, getChildPositions, getWidths } from './groupCommands';
import { COLUMN_GROUP_SPEC } from './groupSpecs';

// Mock schema for testing
const mockSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
    columnGroup: { content: 'columnBlock+', group: 'block' },
    columnBlock: { content: 'block+', group: 'block', attrs: { width: { default: 50 } } },
  }
});

describe('groupCommands (pure functions)', () => {
  it('getChildren returns array of children', () => {
    const cb1 = mockSchema.nodes.columnBlock.create(null, [mockSchema.nodes.paragraph.create()]);
    const cb2 = mockSchema.nodes.columnBlock.create(null, [mockSchema.nodes.paragraph.create()]);
    const cg = mockSchema.nodes.columnGroup.create(null, [cb1, cb2]);
    
    const children = getChildren(cg);
    expect(children.length).toBe(2);
    expect(children[0]).toBe(cb1);
    expect(children[1]).toBe(cb2);
  });

  it('getChildPositions calculates absolute positions correctly', () => {
    const p1 = mockSchema.nodes.paragraph.create(null, mockSchema.text('123')); // size: 2 + 3 = 5
    const cb1 = mockSchema.nodes.columnBlock.create(null, [p1]); // size: 2 + 5 = 7
    
    const p2 = mockSchema.nodes.paragraph.create(null, mockSchema.text('12345')); // size: 2 + 5 = 7
    const cb2 = mockSchema.nodes.columnBlock.create(null, [p2]); // size: 2 + 7 = 9
    
    const cg = mockSchema.nodes.columnGroup.create(null, [cb1, cb2]); // cg node size: 2 + 7 + 9 = 18
    
    const groupPos = 10;
    const positions = getChildPositions(groupPos, cg);
    
    // cb1 starts at groupPos + 1
    expect(positions[0]).toBe(11);
    // cb2 starts at groupPos + 1 + cb1.nodeSize
    expect(positions[1]).toBe(11 + 7);
  });

  it('getWidths extracts widths from children', () => {
    const cb1 = mockSchema.nodes.columnBlock.create({ width: 33.3 }, [mockSchema.nodes.paragraph.create()]);
    const cb2 = mockSchema.nodes.columnBlock.create({ width: 66.7 }, [mockSchema.nodes.paragraph.create()]);
    const cg = mockSchema.nodes.columnGroup.create(null, [cb1, cb2]);
    
    const widths = getWidths(COLUMN_GROUP_SPEC, cg);
    expect(widths).toEqual([33.3, 66.7]);
  });
  
  it('getWidths falls back to defaultWidth if attribute is missing', () => {
    const cb1 = mockSchema.nodes.columnBlock.create(null, [mockSchema.nodes.paragraph.create()]);
    const cg = mockSchema.nodes.columnGroup.create(null, [cb1]);
    
    const widths = getWidths(COLUMN_GROUP_SPEC, cg);
    expect(widths).toEqual([50]); // COLUMN_GROUP_SPEC.defaultWidth is 50
  });

  it('getChildPositions handles variable-size columns correctly', () => {
    // Regression test: ensures positions are additive and not offset
    const p = mockSchema.nodes.paragraph.create(null, mockSchema.text('hello')); // 7 bytes
    const cb1 = mockSchema.nodes.columnBlock.create({ width: 30 }, [p]); // 2 + 7 = 9
    const cb2 = mockSchema.nodes.columnBlock.create({ width: 30 }, [p]); // 9
    const cb3 = mockSchema.nodes.columnBlock.create({ width: 40 }, [p]); // 9
    const cg = mockSchema.nodes.columnGroup.create(null, [cb1, cb2, cb3]);

    const positions = getChildPositions(5, cg); // groupPos = 5
    expect(positions[0]).toBe(6);           // 5 + 1 (opening tag)
    expect(positions[1]).toBe(6 + 9);       // after cb1
    expect(positions[2]).toBe(6 + 9 + 9);   // after cb2
  });
});
