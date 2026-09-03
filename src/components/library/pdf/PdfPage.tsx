import React, { useState, useEffect, useRef } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { LibraryHighlight } from '../../../types';
import type { ReadingMode } from './types';
import { PdfPageCanvas } from './components/PdfPageCanvas';
import { PdfPageTextLayer } from './components/PdfPageTextLayer';
import { PdfPageHighlightLayer } from './components/PdfPageHighlightLayer';
import { PdfPageBookmarkRibbon } from './components/PdfPageBookmarkRibbon';

export interface PdfPageProps {
  pageNum: number;
  pdfDoc: PDFDocumentProxy | null;
  zoom: number;
  isRendered: boolean;
  cssFilter?: string;
  readingMode: ReadingMode;
  bookId: string;
  highlights: LibraryHighlight[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onHighlightClick: (h: LibraryHighlight, rect: DOMRect) => void;
  ocrProcessing: Set<number>;
  setOcrProcessing: React.Dispatch<React.SetStateAction<Set<number>>>;
  onMeasure?: (unscaledWidth: number, unscaledHeight: number) => void;
  pageWidth?: number;
  pageHeight?: number;
}

export const PdfPage: React.FC<PdfPageProps> = React.memo(
  ({
    pageNum,
    pdfDoc,
    zoom,
    isRendered,
    cssFilter,
    readingMode,
    bookId,
    highlights,
    isBookmarked,
    onToggleBookmark,
    onHighlightClick,
    ocrProcessing,
    setOcrProcessing,
    onMeasure,
    pageWidth,
    pageHeight,
  }) => {
    const [pageProxy, setPageProxy] = useState<PDFPageProxy | null>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
      width: pageWidth || Math.round(595 * zoom),
      height: pageHeight || Math.round(842 * zoom),
    });

    // Synchronize dimensions when zoom or cache props update
    useEffect(() => {
      if (pageWidth && pageHeight) {
        setDimensions({ width: pageWidth, height: pageHeight });
      }
    }, [pageWidth, pageHeight]);

    const onMeasureRef = useRef(onMeasure);
    useEffect(() => {
      onMeasureRef.current = onMeasure;
    }, [onMeasure]);

    // Single source of truth: fetch page proxy once when page enters rendering window
    useEffect(() => {
      if (!isRendered || !pdfDoc) return;
      let active = true;

      pdfDoc.getPage(pageNum).then((page) => {
        if (!active) return;
        setPageProxy(page);

        const viewport = page.getViewport({ scale: zoom });
        setDimensions({ width: Math.round(viewport.width), height: Math.round(viewport.height) });
        onMeasureRef.current?.(viewport.width / zoom, viewport.height / zoom);
      }).catch((err) => {
        console.error('Failed to load page proxy for page', pageNum, err);
      });

      return () => {
        active = false;
      };
    }, [pdfDoc, pageNum, zoom, isRendered]);

    return (
      <div
        data-page-number={pageNum}
        className="pdf-page-wrapper"
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
      >
        {isRendered && pageProxy ? (
          <>
            <PdfPageCanvas page={pageProxy} zoom={zoom} cssFilter={cssFilter} />

            <PdfPageTextLayer
              page={pageProxy}
              pageNum={pageNum}
              zoom={zoom}
              bookId={bookId}
              ocrProcessing={ocrProcessing}
              setOcrProcessing={setOcrProcessing}
            />

            <PdfPageHighlightLayer
              highlights={highlights}
              readingMode={readingMode}
              onHighlightClick={onHighlightClick}
            />

            <PdfPageBookmarkRibbon
              isBookmarked={isBookmarked}
              onToggleBookmark={onToggleBookmark}
            />

            {ocrProcessing.has(pageNum) && (
              <div className="ocr-processing-badge">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
                Processando texto...
              </div>
            )}

            <div className="page-number-badge">Pág {pageNum}</div>
          </>
        ) : (
          <div className="w-full h-full bg-black/5 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin opacity-50" />
          </div>
        )}
      </div>
    );
  }
);

PdfPage.displayName = 'PdfPage';
