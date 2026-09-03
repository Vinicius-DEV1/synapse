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

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // Cancel in-flight render task if zoom or page changed
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    const renderContext = {
      canvas,
      canvasContext: context,
      viewport,
      transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
    };

    const task = page.render(renderContext);
    renderTaskRef.current = task;

    task.promise
      .then(() => {
        if (!active) return;
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
      className="w-full h-full block transition-all duration-300"
      style={{ filter: cssFilter || 'none' }}
    />
  );
});

PdfPageCanvas.displayName = 'PdfPageCanvas';
