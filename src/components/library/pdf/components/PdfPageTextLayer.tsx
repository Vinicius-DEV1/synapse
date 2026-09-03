import React, { useState, useEffect, useRef } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import { ocrWorkerPool } from '../utils/ocrWorkerPool';
import type { PdfTextItem } from '../types';

interface PdfPageTextLayerProps {
  page: PDFPageProxy;
  pageNum: number;
  zoom: number;
  bookId: string;
  ocrProcessing: Set<number>;
  setOcrProcessing: React.Dispatch<React.SetStateAction<Set<number>>>;
}

interface RawOcrWord {
  isNormalized?: boolean;
  str: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize?: number;
}

export const PdfPageTextLayer: React.FC<PdfPageTextLayerProps> = React.memo(
  ({ page, pageNum, zoom, bookId, ocrProcessing, setOcrProcessing }) => {
    const [textItems, setTextItems] = useState<PdfTextItem[]>([]);
    const ocrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      let active = true;

      const loadText = async () => {
        try {
          const viewport = page.getViewport({ scale: zoom });
          const textContent = await page.getTextContent();

          if (!active) return;

          if (textContent.items.length > 0) {
            const items: PdfTextItem[] = [];
            for (const rawItem of textContent.items) {
              if ('transform' in rawItem) {
                const tx = rawItem.transform[4];
                const ty = rawItem.transform[5];
                const [x, y] = viewport.convertToViewportPoint(tx, ty);
                const fontSize = Math.abs(rawItem.transform[3]) * viewport.scale;
                const adjustedHeight = fontSize * 1.05;
                const width = rawItem.width * viewport.scale + (rawItem.hasEOL ? fontSize * 0.5 : 0);

                items.push({
                  str: rawItem.str + (rawItem.hasEOL ? ' ' : ''),
                  left: x,
                  top: y - fontSize * 0.85,
                  width,
                  height: adjustedHeight,
                  fontSize,
                  isPdf: true,
                });
              }
            }
            setTextItems(items);
          } else if (window.api?.library) {
            // Scanned page without native text layer - check OCR cache or schedule worker
            const cache = await window.api.library.getOcrCache(bookId, pageNum);
            if (!active) return;

            if (cache) {
              try {
                const rawWords = JSON.parse(cache.word_boxes) as RawOcrWord[];
                const isNormalized = rawWords[0]?.isNormalized;
                const scaledWords: PdfTextItem[] = rawWords.map((w) => ({
                  str: w.str,
                  left: isNormalized ? w.left * viewport.scale : w.left,
                  top: isNormalized ? w.top * viewport.scale : w.top,
                  width: isNormalized ? w.width * viewport.scale : w.width,
                  height: isNormalized ? w.height * viewport.scale : w.height,
                  fontSize: isNormalized ? w.height * viewport.scale * 0.9 : (w.height || 14) * 0.9,
                }));
                setTextItems(scaledWords);
              } catch (e) {
                console.warn('Failed to parse cached OCR word boxes:', e);
              }
            } else if (!ocrProcessing.has(pageNum)) {
              // Trigger OCR after 1-second debounce to avoid worker starvation on fast scrolling
              ocrTimeoutRef.current = setTimeout(async () => {
                if (!active || !window.api?.library) return;
                setOcrProcessing((prev) => new Set(prev).add(pageNum));

                try {
                  // Render a temporary canvas for OCR extraction
                  const ocrCanvas = document.createElement('canvas');
                  const ocrViewport = page.getViewport({ scale: 1.5 });
                  ocrCanvas.width = ocrViewport.width;
                  ocrCanvas.height = ocrViewport.height;
                  const ctx = ocrCanvas.getContext('2d');
                  if (ctx) {
                    await page.render({ canvas: ocrCanvas, canvasContext: ctx, viewport: ocrViewport }).promise;
                    const imgData = ocrCanvas.toDataURL('image/png');
                    const result = await ocrWorkerPool.recognize(imgData);

                    if (!active) return;

                    const rawTessWords = (result.data as { words?: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> }).words || [];
                    const normalizedWords = rawTessWords.map((w) => ({
                      isNormalized: true,
                      str: w.text,
                      left: w.bbox.x0 / ocrViewport.scale,
                      top: w.bbox.y0 / ocrViewport.scale,
                      width: (w.bbox.x1 - w.bbox.x0) / ocrViewport.scale,
                      height: (w.bbox.y1 - w.bbox.y0) / ocrViewport.scale,
                    }));

                    const scaled: PdfTextItem[] = normalizedWords.map((w) => ({
                      str: w.str,
                      left: w.left * viewport.scale,
                      top: w.top * viewport.scale,
                      width: w.width * viewport.scale,
                      height: w.height * viewport.scale,
                      fontSize: w.height * viewport.scale * 0.9,
                    }));

                    setTextItems(scaled);

                    await window.api.library.saveOcrCache({
                      book_id: bookId,
                      page_number: pageNum,
                      text_content: result.data.text,
                      word_boxes: JSON.stringify(normalizedWords),
                    });
                  }
                } catch (ocrErr) {
                  console.error('OCR processing error on page', pageNum, ocrErr);
                } finally {
                  if (active) {
                    setOcrProcessing((prev) => {
                      const next = new Set(prev);
                      next.delete(pageNum);
                      return next;
                    });
                  }
                }
              }, 1000);
            }
          }
        } catch (err) {
          console.error('Failed to extract text content for page', pageNum, err);
        }
      };

      loadText();

      return () => {
        active = false;
        if (ocrTimeoutRef.current) {
          clearTimeout(ocrTimeoutRef.current);
          ocrTimeoutRef.current = null;
        }
      };
    }, [page, pageNum, zoom, bookId]);

    return (
      <div className="pdf-text-layer">
        {textItems.map((item, idx) => (
          <span
            key={idx}
            style={{
              position: 'absolute',
              left: `${item.left}px`,
              top: `${item.top}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              fontSize: `${item.fontSize}px`,
              lineHeight: 1.1,
              fontFamily: 'sans-serif',
              whiteSpace: 'pre',
              color: 'transparent',
            }}
          >
            {item.str}
          </span>
        ))}
      </div>
    );
  }
);

PdfPageTextLayer.displayName = 'PdfPageTextLayer';
