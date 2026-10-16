import { describe, it, expect } from 'vitest';
import { mergeHighlightRects, type HighlightRect } from './highlightRects';

describe('mergeHighlightRects', () => {
  it('returns empty array when given empty input', () => {
    expect(mergeHighlightRects([])).toEqual([]);
  });

  it('returns single rect as-is', () => {
    const single: HighlightRect[] = [{ left: 0.1, top: 0.2, width: 0.3, height: 0.05 }];
    expect(mergeHighlightRects(single)).toEqual(single);
  });

  it('merges adjacent word rectangles on the same line into a single line rectangle', () => {
    // 3 words on line 1: "banco", "de", "dados."
    const wordRects: HighlightRect[] = [
      { left: 0.10, top: 0.20, width: 0.08, height: 0.04 }, // "banco"
      { left: 0.19, top: 0.20, width: 0.04, height: 0.04 }, // "de" (with 0.01 gap)
      { left: 0.24, top: 0.20, width: 0.09, height: 0.04 }, // "dados." (with 0.01 gap)
    ];

    const merged = mergeHighlightRects(wordRects);
    expect(merged).toHaveLength(1);
    expect(merged[0].left).toBe(0.10);
    expect(merged[0].top).toBe(0.20);
    expect(merged[0].width).toBeCloseTo(0.23, 4);
    expect(merged[0].height).toBe(0.04);
  });

  it('merges overlapping rects cleanly without creating duplicates', () => {
    const overlapping: HighlightRect[] = [
      { left: 0.10, top: 0.20, width: 0.15, height: 0.04 },
      { left: 0.20, top: 0.20, width: 0.15, height: 0.04 }, // Overlaps by 0.05
    ];

    const merged = mergeHighlightRects(overlapping);
    expect(merged).toHaveLength(1);
    expect(merged[0].left).toBe(0.10);
    expect(merged[0].width).toBeCloseTo(0.25, 4);
  });

  it('keeps rectangles on different vertical lines separate', () => {
    const multiLine: HighlightRect[] = [
      { left: 0.10, top: 0.20, width: 0.40, height: 0.04 }, // Line 1
      { left: 0.10, top: 0.26, width: 0.50, height: 0.04 }, // Line 2
    ];

    const merged = mergeHighlightRects(multiLine);
    expect(merged).toHaveLength(2);
    expect(merged[0].top).toBe(0.20);
    expect(merged[1].top).toBe(0.26);
  });

  it('filters out degenerate rectangles with zero width or height', () => {
    const rects: HighlightRect[] = [
      { left: 0.10, top: 0.20, width: 0.30, height: 0.04 },
      { left: 0.40, top: 0.20, width: 0, height: 0.04 },
      { left: 0.50, top: 0.20, width: 0.10, height: 0 },
    ];

    const merged = mergeHighlightRects(rects);
    expect(merged).toHaveLength(1);
    expect(merged[0].width).toBe(0.30);
  });
});
