import { describe, it, expect, beforeEach } from 'vitest';
import { PdfDimensionCache } from './pdfDimensionCache';

describe('PdfDimensionCache', () => {
  let cache: PdfDimensionCache;

  beforeEach(() => {
    cache = new PdfDimensionCache();
  });

  it('provides default A4 dimensions when uninitialized', () => {
    const dim = cache.getPageDimension(1);
    expect(dim.width).toBe(595);
    expect(dim.height).toBe(842);
    expect(dim.aspectRatio).toBeCloseTo(595 / 842, 3);
  });

  it('updates baseline from first measured page', () => {
    cache.setPageDimension(1, 600, 900);
    const dim1 = cache.getPageDimension(1);
    expect(dim1.width).toBe(600);
    expect(dim1.height).toBe(900);

    // Page 2 should inherit baseline
    const dim2 = cache.getPageDimension(2);
    expect(dim2.width).toBe(600);
    expect(dim2.height).toBe(900);
  });

  it('calculates page offsets with zoom and gap accurately', () => {
    cache.setBaseline(500, 800);
    // zoom = 1.5 -> height = 1200, gap = 16
    const offsetPage1 = cache.getPageOffset(1, 1.5, 16);
    expect(offsetPage1).toBe(0);

    const offsetPage2 = cache.getPageOffset(2, 1.5, 16);
    expect(offsetPage2).toBe(1216);

    const offsetPage3 = cache.getPageOffset(3, 1.5, 16);
    expect(offsetPage3).toBe(2432);
  });

  it('finds visible page at scrollTop', () => {
    cache.setBaseline(500, 1000);
    const gap = 20;
    // Each page takes 1020px at zoom 1.0
    expect(cache.findPageAtScrollTop(0, 10, 1.0, gap)).toBe(1);
    expect(cache.findPageAtScrollTop(500, 10, 1.0, gap)).toBe(1);
    expect(cache.findPageAtScrollTop(1021, 10, 1.0, gap)).toBe(2);
    expect(cache.findPageAtScrollTop(2050, 10, 1.0, gap)).toBe(3);
  });
});
