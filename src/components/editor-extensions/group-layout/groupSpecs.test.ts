import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { COLUMN_GROUP_SPEC, LINK_GROUP_SPEC, getSpecByName, pickSpecForPair } from './groupSpecs';

// Mock schema for testing
const mockSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
    columnGroup: { content: 'columnBlock+', group: 'block' },
    columnBlock: { content: 'block+', group: 'block', attrs: { width: { default: 50 } } },
    linkGroup: { content: 'linkPreview+', group: 'block' },
    linkPreview: { group: 'block', attrs: { width: { default: 50 }, url: { default: '' } } },
    heading: { content: 'text*', group: 'block' }
  }
});

describe('groupSpecs', () => {
  describe('COLUMN_GROUP_SPEC', () => {
    it('accepts valid blocks', () => {
      const p = mockSchema.nodes.paragraph.create();
      expect(COLUMN_GROUP_SPEC.acceptsContent([p])).toBe(true);
    });

    it('rejects structural nodes', () => {
      const cg = mockSchema.nodes.columnGroup.create(null, [
        mockSchema.nodes.columnBlock.create(null, [mockSchema.nodes.paragraph.create()])
      ]);
      expect(COLUMN_GROUP_SPEC.acceptsContent([cg])).toBe(false);
    });

    it('wraps content correctly', () => {
      const p = mockSchema.nodes.paragraph.create(null, mockSchema.text('hello'));
      const child = COLUMN_GROUP_SPEC.wrapAsChild(mockSchema, [p], 33);
      expect(child).not.toBeNull();
      expect(child!.type.name).toBe('columnBlock');
      expect(child!.attrs.width).toBe(33);
      expect(child!.childCount).toBe(1);
    });
    
    it('returns child content', () => {
      const p = mockSchema.nodes.paragraph.create(null, mockSchema.text('hello'));
      const child = COLUMN_GROUP_SPEC.wrapAsChild(mockSchema, [p], 50);
      const content = COLUMN_GROUP_SPEC.childContent(child!);
      expect(content.length).toBe(1);
      expect(content[0].type.name).toBe('paragraph');
    });
  });

  describe('LINK_GROUP_SPEC', () => {
    it('accepts linkPreview nodes', () => {
      const lp = mockSchema.nodes.linkPreview.create({ url: 'https://example.com' });
      expect(LINK_GROUP_SPEC.acceptsContent([lp])).toBe(true);
    });

    it('rejects other nodes', () => {
      const p = mockSchema.nodes.paragraph.create();
      expect(LINK_GROUP_SPEC.acceptsContent([p])).toBe(false);
    });

    it('wraps as child correctly (passes through with new width)', () => {
      const lp = mockSchema.nodes.linkPreview.create({ url: 'https://example.com' });
      const child = LINK_GROUP_SPEC.wrapAsChild(mockSchema, [lp], 25);
      expect(child).not.toBeNull();
      expect(child!.type.name).toBe('linkPreview');
      expect(child!.attrs.width).toBe(25);
    });
  });

  describe('utility functions', () => {
    it('pickSpecForPair picks LINK_GROUP_SPEC when dragging link over link', () => {
      const lp1 = mockSchema.nodes.linkPreview.create();
      const lp2 = mockSchema.nodes.linkPreview.create();
      const spec = pickSpecForPair([lp1], lp2);
      expect(spec).toBe(LINK_GROUP_SPEC);
    });

    it('pickSpecForPair picks COLUMN_GROUP_SPEC for generic blocks', () => {
      const p1 = mockSchema.nodes.paragraph.create();
      const p2 = mockSchema.nodes.paragraph.create();
      const spec = pickSpecForPair([p1], p2);
      expect(spec).toBe(COLUMN_GROUP_SPEC);
    });

    it('getSpecByName works', () => {
      expect(getSpecByName('columnGroup')).toBe(COLUMN_GROUP_SPEC);
      expect(getSpecByName('linkGroup')).toBe(LINK_GROUP_SPEC);
      expect(getSpecByName('unknown')).toBeNull();
    });
  });
});
