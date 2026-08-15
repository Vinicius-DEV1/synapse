/**
 * useImageResize.ts
 *
 * Redimensionamento de imagens com preview local.
 *
 * O ponto crítico: a versão anterior chamava `updateAttributes()` a cada
 * `mousemove`, ou seja, uma transação ProseMirror + escrita no Y.Doc + um
 * `editor.getHTML()` completo + `getYDocStateAsBase64()` a ~60fps. Em páginas
 * grandes isso travava o editor e enchia o histórico de undo com centenas de
 * passos.
 *
 * Agora o arrasto só mexe em estado React local (preview) e apenas UM
 * `updateAttributes()` é emitido no `pointerup`.
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
  /** Elemento usado para descobrir a largura máxima disponível. */
  boundsRef: RefObject<HTMLElement | null>;
  width: number | null;
  height: number | null;
  /** Chamado uma única vez, no fim do arrasto. */
  onCommit: (size: ImageSize) => void;
  /** Chamado no início do arrasto (para selecionar o node, por exemplo). */
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

  // Garante que nada fique pendurado se o node view for destruído no meio do arrasto.
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
        // Shift = redimensionamento livre (distorce). Padrão = proporcional.
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
          /* já liberado */
        }

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        const result = previewRef.current;
        previewRef.current = null;
        setPreview(null);
        setIsResizing(false);

        // Clique seco na alça não deve gravar nada (evita transação/salvamento inútil).
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

  /** Volta ao tamanho natural da imagem (duplo clique numa alça). */
  const resetSize = useCallback(() => {
    onCommit({ width: null, height: null });
  }, [onCommit]);

  /** Ajusta a imagem à largura total do editor. */
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
