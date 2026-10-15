import React, { useEffect, useRef } from 'react';
import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';

interface PdfPageCanvasProps {
  page: PDFPageProxy;
  zoom: number;
  cssFilter?: string;
}

export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = React.memo(({ page, zoom, cssFilter }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewport = page.getViewport({ scale: zoom });
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.floor(viewport.width * pixelRatio);
    const targetHeight = Math.floor(viewport.height * pixelRatio);

    // Cancel in-flight render task if zoom or page changed
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    // Render off-screen first to eliminate white/black flashing on zoom/scroll
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = targetWidth;
    offscreenCanvas.height = targetHeight;
    const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    if (!offscreenCtx) return;

    const renderContext = {
      canvas: offscreenCanvas,
      canvasContext: offscreenCtx,
      viewport,
      transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
    };

    const task = page.render(renderContext);
    renderTaskRef.current = task;

    task.promise
      .then(() => {
        if (!active || !canvasRef.current) return;
        const currentCanvas = canvasRef.current;
        currentCanvas.width = targetWidth;
        currentCanvas.height = targetHeight;
        const destCtx = currentCanvas.getContext('2d', { alpha: false });
        destCtx?.drawImage(offscreenCanvas, 0, 0);
        renderTaskRef.current = null;
      })
      .catch((err: unknown) => {
        const error = err as { name?: string };
        if (error?.name !== 'RenderingCancelledException') {
          console.error('Failed to render PDF page on canvas:', err);
        }
      });

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [page, zoom]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block transition-[filter] duration-200 ease-out"
      style={{ filter: cssFilter || 'none' }}
    />
  );
});

PdfPageCanvas.displayName = 'PdfPageCanvas';
