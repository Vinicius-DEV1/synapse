import React, { useState, useEffect, useRef } from 'react';
import { ocrWorkerPool } from './utils/ocrWorkerPool';
import type { LibraryHighlight } from '../../../types';

export interface PdfPageProps {
  pageNum: number;
  pdfDoc: any;
  zoom: number;
  isRendered: boolean;
  cssFilter?: string;
  readingMode: 'light' | 'sepia' | 'mint' | 'dark' | 'dim' | 'nord' | 'high-contrast' | 'midnight';
  bookId: string;
  highlights: LibraryHighlight[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onHighlightClick: (h: LibraryHighlight, rect: DOMRect) => void;
  pageRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  canvasRefs: React.MutableRefObject<Map<number, HTMLCanvasElement>>;
  ocrProcessing: Set<number>;
  setOcrProcessing: React.Dispatch<React.SetStateAction<Set<number>>>;
  activeHighlight?: { highlight: LibraryHighlight; position: any } | null;
  onMeasure?: (height: number) => void;
}

export const PdfPage = React.memo(({
  pageNum, pdfDoc, zoom, isRendered, cssFilter, readingMode, bookId, highlights: _highlights, isBookmarked,
  onToggleBookmark, onHighlightClick, pageRefs, canvasRefs, ocrProcessing, setOcrProcessing, onMeasure
}: PdfPageProps) => {
  const [dimensions, setDimensions] = useState({ width: 600, height: 800 }); // Default
  const [textItems, setTextItems] = useState<any[]>([]);
  const renderTaskRef = useRef<any>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRendered) return;
    let active = true;
    const initPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        if (active) {
          setDimensions({ width: viewport.width, height: viewport.height });
          onMeasure?.(viewport.height / zoom);
        }
      } catch (e) {
        console.error("Failed to init page", e);
      }
    };
    initPage();
    return () => { active = false; };
  }, [pdfDoc, pageNum, zoom, isRendered]);

  useEffect(() => {
    if (!isRendered) return;
    
    let active = true;
    let ocrTimeout: any = null;
    
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        
        // Cancel previous render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = { 
          canvasContext: context, 
          viewport: viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0]
        };
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        
        if (!active) return;

        // Get text content
        const textContent = await page.getTextContent();
        if (textContent.items.length > 0) {
          setTextItems(textContent.items.map((item: any) => {
            if ('transform' in item) {
              const tx = item.transform[4];
              const ty = item.transform[5];
              const [x, y] = viewport.convertToViewportPoint(tx, ty);
              const fontSize = Math.abs(item.transform[3]) * viewport.scale;
              // Fine-tuning for line height and top bounding box
              // Multiply fontSize by scale factor to align invisible text layer
              const adjustedHeight = fontSize * 1.05; 
              return {
                str: item.str + (item.hasEOL ? ' ' : ''), // Use space instead of newline
                left: x,
                top: y - (fontSize * 0.85),
                width: (item.width * viewport.scale) + (item.hasEOL ? fontSize * 0.5 : 0),
                height: adjustedHeight,
                fontSize: fontSize,
                isPdf: true,
                transform: item.transform
              };
            }
            return item;
          }));
        } else {
          // No text layer, try OCR
          const cache = await window.api.library.getOcrCache(bookId, pageNum);
          if (cache) {
            const rawWords = JSON.parse(cache.word_boxes);
            const isNormalized = rawWords[0]?.isNormalized;
            
            const scaledWords = rawWords.map((w: any) => ({
              ...w,
              left: isNormalized ? w.left * viewport.scale : w.left,
              top: isNormalized ? w.top * viewport.scale : w.top,
              width: isNormalized ? w.width * viewport.scale : w.width,
              height: isNormalized ? w.height * viewport.scale : w.height,
              fontSize: isNormalized ? w.height * viewport.scale * 0.9 : w.height * 0.9
            }));
            setTextItems(scaledWords);
          } else if (!ocrProcessing.has(pageNum)) {
            // Trigger OCR with a debounce to prevent spawning workers while scrolling rapidly
            ocrTimeout = setTimeout(async () => {
              if (!active) return;
              setOcrProcessing(prev => new Set(prev).add(pageNum));
              
              try {
                const imgData = canvas.toDataURL('image/png');
                const result = await ocrWorkerPool.recognize(imgData);
                
                if (!active) return;
                
                const rawWords = (result.data as any).words || [];
                const words = rawWords.map((w: any) => ({
                  isNormalized: true,
                  str: w.text,
                  left: w.bbox.x0 / viewport.scale,
                  top: w.bbox.y0 / viewport.scale,
                  width: (w.bbox.x1 - w.bbox.x0) / viewport.scale,
                  height: (w.bbox.y1 - w.bbox.y0) / viewport.scale
                }));
                
                const scaledWords = words.map((w: any) => ({
                  ...w,
                  left: w.left * viewport.scale,
                  top: w.top * viewport.scale,
                  width: w.width * viewport.scale,
                  height: w.height * viewport.scale,
                  fontSize: w.height * viewport.scale * 0.9
                }));
                
                setTextItems(scaledWords);
                await window.api.library.saveOcrCache({
                  book_id: bookId,
                  page_number: pageNum,
                  text_content: result.data.text,
                  word_boxes: JSON.stringify(words)
                });
              } catch (err) {
                console.error("OCR failed for page", pageNum, err);
              } finally {
                if (active) {
                  setOcrProcessing(prev => {
                    const next = new Set(prev);
                    next.delete(pageNum);
                    return next;
                  });
                }
              }
            }, 1000); // Wait 1s before starting OCR
          }
        }
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
          console.error("Failed to render page", pageNum, e);
        }
      }
    };
    
    renderPage();
    return () => { 
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      if (ocrTimeout) clearTimeout(ocrTimeout);
    };
  }, [isRendered, pdfDoc, pageNum, zoom, bookId]); // Intentionally omitting ocrProcessing and setOcrProcessing to prevent loops

  useEffect(() => {
    if (!isRendered || !textLayerRef.current || textItems.length === 0) return;
    
    // Mathematically scale browser text layer to match rendered PDF dimensions
    // on physical text width drawn on Canvas (official PDF.js technique)
    const spans = textLayerRef.current.querySelectorAll('span');
    spans.forEach(span => {
      const targetWidth = parseFloat(span.getAttribute('data-target-width') || '0');
      const naturalWidth = span.getBoundingClientRect().width;
      if (naturalWidth > 0 && targetWidth > 0) {
        const scale = targetWidth / naturalWidth;
        span.style.transform = `scaleX(${scale})`;
      }
    });
  }, [textItems, zoom, isRendered]);

  return (
    <div 
      ref={(el) => { if (el) pageRefs.current.set(pageNum, el); }}
      data-page-number={pageNum}
      className="pdf-page-wrapper"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {isRendered ? (
        <>
          <canvas 
            ref={(el) => { if (el) canvasRefs.current.set(pageNum, el); }}
            className="w-full h-full block transition-all duration-300"
            style={{ filter: cssFilter || 'none' }}
          />
          
          <div className="pdf-text-layer" ref={textLayerRef}>
            {textItems.map((item, idx) => {
              const targetWidth = item.width;
              return (
                <span 
                  key={idx}
                  data-target-width={targetWidth}
                  style={{
                    position: 'absolute',
                    left: item.left,
                    top: item.top,
                    height: item.height,
                    fontSize: item.fontSize,
                    lineHeight: 1.1,
                    fontFamily: 'sans-serif',
                    whiteSpace: 'pre',
                    color: 'transparent',
                    transformOrigin: 'left bottom',
                  }}
                >
                  {item.str}
                </span>
              );
            })}
          </div>

          <div className="pdf-highlight-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {_highlights.map((h, i) => {
              try {
                const rects = JSON.parse(h.rects);
                return rects.map((r: any, j: number) => {
                  let colorHex = '#fbbf24'; // yellow
                  if (h.color === 'green') colorHex = '#34d399';
                  if (h.color === 'blue') colorHex = '#60a5fa';
                  if (h.color === 'pink') colorHex = '#f472b6';
                  if (h.color === 'orange') colorHex = '#fb923c';

                  const isDarkMode = readingMode === 'dark' || readingMode === 'dim' || readingMode === 'nord' || readingMode === 'high-contrast' || readingMode === 'midnight';

                  return (
                    <div 
                      key={`${i}-${j}`}
                      onClick={(e) => {
                        // Prevent text selection click interference
                        e.stopPropagation();
                        // Send click coordinates to position modal
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        onHighlightClick(h, rect);
                      }}
                      className="cursor-pointer transition-opacity hover:opacity-75"
                      style={{
                        position: 'absolute',
                        left: `${r.left * 100}%`,
                        top: `${r.top * 100}%`,
                        width: `${r.width * 100}%`,
                        height: `${r.height * 100}%`,
                        backgroundColor: colorHex,
                        opacity: isDarkMode ? 0.35 : 0.45,
                        mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                        borderRadius: '2px',
                        pointerEvents: 'auto'
                      }}
                    />
                  );
                });
              } catch (e) {
                return null;
              }
            })}
          </div>

          <div 
            className={`bookmark-ribbon ${!isBookmarked ? 'bookmark-ribbon-empty' : ''}`}
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remover marcador' : 'Adicionar marcador'}
          />

          {ocrProcessing.has(pageNum) && (
            <div className="ocr-processing-badge">
              <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              Processando texto...
            </div>
          )}

          <div className="page-number-badge">
            Pág {pageNum}
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-black/5 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      )}
    </div>
  );
});
