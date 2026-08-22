import { describe, it, expect } from 'vitest';
import { ColumnBlock } from './ColumnBlock';

describe('ColumnBlock TipTap Extension', () => {
  it('has correct schema configuration', () => {
    expect(ColumnBlock.name).toBe('columnBlock');
    expect(ColumnBlock.config.group).toBe('column');
    expect(ColumnBlock.config.content).toBe('block+');
    expect(ColumnBlock.config.isolating).toBe(true);
  });

  it('renders HTML attributes with --group-flex and data-group-child markers', () => {
    const renderFn = ColumnBlock.config.renderHTML;
    expect(renderFn).toBeDefined();

    const output = renderFn!({ HTMLAttributes: { width: 33.3 } });
    expect(output[0]).toBe('div');
    expect(output[1]).toEqual(
      expect.objectContaining({
        'data-type': 'columnBlock',
        'data-group-child': '',
        class: 'column-block',
      })
    );
  });
});
