import type { PageDimensions } from '../types';

/**
 * High-performance dimension and layout cache for PDF pages.
 * Pre-warms aspect ratios from document pages and computes vertical offsets
 * with zero layout shifts and constant-time lookups.
 */
export class PdfDimensionCache {
  private dimensions = new Map<number, PageDimensions>();
  private defaultWidth = 595; // Default A4 width in points
  private defaultHeight = 842; // Default A4 height in points
  private hasBaseline = false;

  /**
   * Set baseline dimensions from page 1 or document metadata.
   */
  public setBaseline(width: number, height: number): void {
    if (width > 0 && height > 0) {
      this.defaultWidth = width;
      this.defaultHeight = height;
      this.hasBaseline = true;
    }
  }

  /**
   * Cache specific page dimensions (unscaled at zoom = 1.0).
   */
  public setPageDimension(pageNum: number, width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    
    const aspectRatio = width / height;
    this.dimensions.set(pageNum, { width, height, aspectRatio });

    if (!this.hasBaseline) {
      this.setBaseline(width, height);
    }
  }

  /**
   * Get unscaled page dimensions.
   */
  public getPageDimension(pageNum: number): PageDimensions {
    const cached = this.dimensions.get(pageNum);
    if (cached) return cached;

    return {
      width: this.defaultWidth,
      height: this.defaultHeight,
      aspectRatio: this.defaultWidth / this.defaultHeight,
    };
  }

  /**
   * Get height of a page at the specified zoom level.
   */
  public getPageHeight(pageNum: number, zoom: number): number {
    const dim = this.getPageDimension(pageNum);
    return Math.round(dim.height * zoom);
  }

  /**
   * Get width of a page at the specified zoom level.
   */
  public getPageWidth(pageNum: number, zoom: number): number {
    const dim = this.getPageDimension(pageNum);
    return Math.round(dim.width * zoom);
  }

  /**
   * Get vertical scroll offset for a target page (1-based index).
   */
  public getPageOffset(targetPage: number, zoom: number, pageGap: number): number {
    let offset = 0;
    for (let i = 1; i < targetPage; i++) {
      offset += this.getPageHeight(i, zoom) + pageGap;
    }
    return offset;
  }

  /**
   * Find which page is visible given a scrollTop position.
   */
  public findPageAtScrollTop(scrollTop: number, totalPages: number, zoom: number, pageGap: number): number {
    let accum = 0;
    for (let i = 1; i <= totalPages; i++) {
      const h = this.getPageHeight(i, zoom) + pageGap;
      if (accum + h > scrollTop) {
        return i;
      }
      accum += h;
    }
    return Math.max(1, totalPages);
  }

  /**
   * Reset cache when switching documents.
   */
  public clear(): void {
    this.dimensions.clear();
    this.defaultWidth = 595;
    this.defaultHeight = 842;
    this.hasBaseline = false;
  }
}
