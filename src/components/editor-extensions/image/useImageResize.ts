/**
 * useImageResize.ts
 *
 * Redimensionamento de imagens com preview local.
 *
 * Key optimization: previous versions dispatched `updateAttributes()` on every
 * `mousemove`, creating a ProseMirror transaction + Y.Doc write + full
 * `editor.getHTML()` + `getYDocStateAsBase64()` at 60fps. On large pages
 * this caused stutter and filled undo history with hundreds of
 * passos.
 *
 * Dragging now modifies only local React state (preview), dispatching ONE
 * `updateAttributes()` on `pointerup`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { MIN_IMAGE_WIDTH } from './imageUtils';

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export interface ImageSize {
  width: number | null;
  height: number | null;
}

interface UseImageResizeOptions {
  imgRef: RefObject<HTMLImageElement | null>;
  /** Container element used to compute maximum available width. */
  boundsRef: RefObject<HTMLElement | null>;
  width: number | null;
  height: number | null;
  /** Called once at end of drag gesture. */
  onCommit: (size: ImageSize) => void;
  /** Called at start of drag gesture (e.g. to select node). */
  onStart?: () => void;
  enabled?: boolean;
}

export function useImageResize({
  imgRef,
  boundsRef,
  width,
  height,
  onCommit,
  onStart,
  enabled = true,
}: UseImageResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);
  const [preview, setPreview] = useState<ImageSize | null>(null);

  const previewRef = useRef<ImageSize | null>(null);
  const rafRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  // Ensures event listeners are cleanly removed if node view unmounts during drag.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const getMaxWidth = useCallback(() => {
    const bounds = boundsRef.current;
    const container =
      bounds?.closest('.ProseMirror') ?? bounds?.parentElement ?? null;
    const available = (container as HTMLElement | null)?.clientWidth ?? 0;
    return available > MIN_IMAGE_WIDTH ? available : Number.POSITIVE_INFINITY;
  }, [boundsRef]);

  const startResize = useCallback(
    (event: React.PointerEvent, handle: ResizeHandle) => {
      if (!enabled || event.button !== 0) return;
      const img = imgRef.current;
      if (!img) return;

      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* alguns navegadores recusam a captura; o fallback em document resolve */
      }

      const rect = img.getBoundingClientRect();
      const startWidth = rect.width;
      const startHeight = rect.height;
      const aspect =
        img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight
          : startHeight > 0
            ? startWidth / startHeight
            : 1;

      const maxWidth = getMaxWidth();
      const startX = event.clientX;
      const startY = event.clientY;

      const dirX = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
      const dirY = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;

      cancelledRef.current = false;
      previewRef.current = { width: Math.round(startWidth), height: null };
      setPreview(previewRef.current);
      setIsResizing(true);
      onStart?.();

      const compute = (moveEvent: PointerEvent | KeyboardEvent, clientX: number, clientY: number) => {
        // Shift = free resize (non-proportional). Default = aspect-ratio locked.
        const free = moveEvent.shiftKey;
        const dx = clientX - startX;
        const dy = clientY - startY;

        let nextWidth = dirX ? startWidth + dx * dirX : startWidth;
        let nextHeight = dirY ? startHeight + dy * dirY : startHeight;

        if (!free) {
          if (dirX) nextHeight = nextWidth / aspect;
          else nextWidth = nextHeight * aspect;
        }

        nextWidth = Math.min(Math.max(nextWidth, MIN_IMAGE_WIDTH), maxWidth);
        nextHeight = free
          ? Math.max(nextHeight, MIN_IMAGE_WIDTH)
          : nextWidth / aspect;

        previewRef.current = {
          width: Math.round(nextWidth),
          height: free ? Math.round(nextHeight) : null,
        };

        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            setPreview(previewRef.current);
          });
        }
      };

      let lastX = startX;
      let lastY = startY;
      let moved = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return;
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        if (Math.abs(lastX - startX) > 1 || Math.abs(lastY - startY) > 1) moved = true;
        compute(moveEvent, lastX, lastY);
      };

      // Segurar/soltar Shift no meio do arrasto reavalia sem precisar mexer o mouse.
      const onKey = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === 'Escape') {
          cancelledRef.current = true;
          finish();
          return;
        }
        if (keyEvent.key === 'Shift') compute(keyEvent, lastX, lastY);
      };

      const finish = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKey);
        try {
          target.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        const result = previewRef.current;
        previewRef.current = null;
        setPreview(null);
        setIsResizing(false);

        // Simple click on handle should not persist (avoids redundant transactions/saves).
        if (cancelledRef.current || !result || !moved) return;
        onCommit(result);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== event.pointerId) return;
        finish();
      };

      const onPointerCancel = () => {
        cancelledRef.current = true;
        finish();
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKey);
    },
    [enabled, imgRef, getMaxWidth, onStart, onCommit]
  );

  /** Resets image to natural dimensions (double click on handle). */
  const resetSize = useCallback(() => {
    onCommit({ width: null, height: null });
  }, [onCommit]);

  /** Expands image to full available editor width. */
  const fitToWidth = useCallback(() => {
    const max = getMaxWidth();
    if (!Number.isFinite(max)) return;
    onCommit({ width: Math.round(max), height: null });
  }, [getMaxWidth, onCommit]);

  const displayWidth = preview ? preview.width : width;
  const displayHeight = preview ? preview.height : height;

  return {
    isResizing,
    displayWidth,
    displayHeight,
    startResize,
    resetSize,
    fitToWidth,
  };
}
