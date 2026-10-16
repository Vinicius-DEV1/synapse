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
  private isUniform = true;

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
    } else if (height !== this.defaultHeight || width !== this.defaultWidth) {
      this.isUniform = false;
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
   * Get vertical scroll offset for a target page (1-based index) in O(1) for uniform pages.
   */
  public getPageOffset(targetPage: number, zoom: number, pageGap: number): number {
    if (targetPage <= 1) return 0;

    // Fast-path O(1) for uniform pages
    if (this.isUniform) {
      const pageHeightWithGap = Math.round(this.defaultHeight * zoom) + pageGap;
      return (targetPage - 1) * pageHeightWithGap;
    }

    let offset = 0;
    for (let i = 1; i < targetPage; i++) {
      offset += this.getPageHeight(i, zoom) + pageGap;
    }
    return offset;
  }

  /**
   * Find which page is visible given a scrollTop position in O(1) or O(log N).
   */
  public findPageAtScrollTop(scrollTop: number, totalPages: number, zoom: number, pageGap: number): number {
    if (scrollTop <= 0 || totalPages <= 1) return 1;

    // Fast-path O(1) for uniform pages
    if (this.isUniform) {
      const pageHeightWithGap = Math.round(this.defaultHeight * zoom) + pageGap;
      if (pageHeightWithGap <= 0) return 1;
      const pageIndex = Math.floor(scrollTop / pageHeightWithGap) + 1;
      return Math.max(1, Math.min(totalPages, pageIndex));
    }

    // Binary search O(log N) for variable page heights
    let low = 1;
    let high = totalPages;
    let candidate = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const offset = this.getPageOffset(mid, zoom, pageGap);
      const pageH = this.getPageHeight(mid, zoom) + pageGap;

      if (scrollTop >= offset && scrollTop < offset + pageH) {
        return mid;
      } else if (scrollTop < offset) {
        high = mid - 1;
      } else {
        candidate = mid;
        low = mid + 1;
      }
    }

    return Math.max(1, Math.min(totalPages, candidate));
  }

  /**
   * Compute top and bottom virtualization spacers in O(1) time without layout loops.
   */
  public getSpacerHeights(
    start: number,
    end: number,
    totalPages: number,
    zoom: number,
    pageGap: number
  ): { topSpacerHeight: number; bottomSpacerHeight: number } {
    const topSpacerHeight = start > 1 ? this.getPageOffset(start, zoom, pageGap) : 0;
    const bottomSpacerHeight =
      end < totalPages
        ? this.getPageOffset(totalPages + 1, zoom, pageGap) - this.getPageOffset(end + 1, zoom, pageGap)
        : 0;

    return {
      topSpacerHeight: Math.max(0, topSpacerHeight),
      bottomSpacerHeight: Math.max(0, bottomSpacerHeight),
    };
  }

  /**
   * Reset cache when switching documents.
   */
  public clear(): void {
    this.dimensions.clear();
    this.defaultWidth = 595;
    this.defaultHeight = 842;
    this.hasBaseline = false;
    this.isUniform = true;
  }
}
