import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import type { LibraryBook, LibraryHighlight } from '../../../../types';
import type { ReadingMode } from '../utils/pdfThemes';

export type { PDFDocumentProxy, PDFPageProxy, RenderTask };
export type { ReadingMode };

export interface PdfTextItem {
  str: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  isPdf?: boolean;
  transform?: number[];
  hasEOL?: boolean;
}

export interface PageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ActiveHighlightState {
  highlight: LibraryHighlight;
  position: { x: number; y: number };
}

export interface TextSelectionState {
  text: string;
  pageContext?: string;
  rects: Array<{
    top: number;
    left: number;
    width: number;
    height: number;
  }>;
  pageNum: number;
  position: { x: number; y: number };
}

export interface LoadProgressState {
  percent: number;
  stage: string;
}

export interface DictionaryTargetState {
  word: string;
  context?: string;
  preloadedData?: unknown;
  selection?: unknown;
}

export interface PdfReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}
