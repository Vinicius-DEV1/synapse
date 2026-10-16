export interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Merges adjacent or overlapping word rectangles belonging to the same line
 * into a single unified continuous line rectangle.
 *
 * This eliminates the "pill" seams, patchy gaps, and overlapping opacity
 * hotspots when PDF.js text layer returns separate bounding boxes per word.
 */
export function mergeHighlightRects(
  rects: HighlightRect[],
  options?: {
    /** Maximum relative horizontal gap between words to bridge on the same line (default: 0.02 = ~2% of width) */
    horizontalGapTolerance?: number;
    /** Minimum vertical overlap ratio between two rects to be considered on the same line (default: 0.4) */
    verticalOverlapRatio?: number;
  }
): HighlightRect[] {
  if (!rects || rects.length <= 1) {
    return rects ? [...rects] : [];
  }

  const gapTolerance = options?.horizontalGapTolerance ?? 0.025;
  const minOverlapRatio = options?.verticalOverlapRatio ?? 0.35;

  // 1. Sanitize & filter degenerate rects
  const validRects = rects.filter(
    (r) =>
      Number.isFinite(r.left) &&
      Number.isFinite(r.top) &&
      Number.isFinite(r.width) &&
      Number.isFinite(r.height) &&
      r.width > 0 &&
      r.height > 0
  );

  if (validRects.length <= 1) return validRects;

  // 2. Sort primarily by vertical position (top), then horizontal (left)
  const sorted = [...validRects].sort((a, b) => {
    const verticalDiff = a.top - b.top;
    if (Math.abs(verticalDiff) > Math.min(a.height, b.height) * 0.35) {
      return verticalDiff;
    }
    return a.left - b.left;
  });

  const merged: HighlightRect[] = [];
  let current: HighlightRect = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    const currentBottom = current.top + current.height;
    const nextBottom = next.top + next.height;

    // Check vertical overlap
    const verticalOverlapStart = Math.max(current.top, next.top);
    const verticalOverlapEnd = Math.min(currentBottom, nextBottom);
    const verticalOverlap = Math.max(0, verticalOverlapEnd - verticalOverlapStart);
    const minHeight = Math.min(current.height, next.height);
    const isSameLine =
      minHeight > 0 && verticalOverlap / minHeight >= minOverlapRatio;

    // Check horizontal adjacency / overlap
    const currentRight = current.left + current.width;
    const isHorizontallyConnected =
      next.left <= currentRight + gapTolerance &&
      next.left + next.width >= current.left - gapTolerance;

    if (isSameLine && isHorizontallyConnected) {
      // Merge next into current
      const newLeft = Math.min(current.left, next.left);
      const newTop = Math.min(current.top, next.top);
      const newRight = Math.max(currentRight, next.left + next.width);
      const newBottom = Math.max(currentBottom, nextBottom);

      current = {
        left: Number(newLeft.toFixed(6)),
        top: Number(newTop.toFixed(6)),
        width: Number((newRight - newLeft).toFixed(6)),
        height: Number((newBottom - newTop).toFixed(6)),
      };
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}
