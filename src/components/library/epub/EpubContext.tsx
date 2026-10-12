import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Rendition, Book } from 'epubjs';
import type { LibraryBook, LibraryHighlight, LibraryBookmark, ReadingMode } from '../../../types';
import { getSettings, saveSettings } from '../../../utils/settings';

export interface TocItem {
  id?: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

export type EpubLineHeight = 'compact' | 'normal' | 'relaxed';
export type EpubTextAlign = 'justify' | 'left';
export type EpubParagraphSpacing = 'compact' | 'spaced';

interface EpubContextType {
  book: LibraryBook;
  rendition: Rendition | null;
  setRendition: (rendition: Rendition | null) => void;
  epubBook: Book | null;
  setEpubBook: (book: Book | null) => void;
  
  // Reading Settings
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  readingMode: ReadingMode;
  setReadingMode: (mode: ReadingMode | ((prev: ReadingMode) => ReadingMode)) => void;
  fontFamily: 'sans' | 'serif' | 'opendyslexic' | 'original';
  setFontFamily: React.Dispatch<React.SetStateAction<'sans' | 'serif' | 'opendyslexic' | 'original'>>;
  originalFontName: string | null;
  setOriginalFontName: React.Dispatch<React.SetStateAction<string | null>>;
  detectedFontSizePx: string | null;
  setDetectedFontSizePx: React.Dispatch<React.SetStateAction<string | null>>;
  scrollMode: boolean;
  setScrollMode: React.Dispatch<React.SetStateAction<boolean>>;
  textWidth: 'narrow' | 'medium' | 'full';
  setTextWidth: (w: 'narrow' | 'medium' | 'full' | ((prev: 'narrow' | 'medium' | 'full') => 'narrow' | 'medium' | 'full')) => void;
  lineHeight: EpubLineHeight;
  setLineHeight: (lh: EpubLineHeight | ((prev: EpubLineHeight) => EpubLineHeight)) => void;
  textAlign: EpubTextAlign;
  setTextAlign: (ta: EpubTextAlign | ((prev: EpubTextAlign) => EpubTextAlign)) => void;
  paragraphSpacing: EpubParagraphSpacing;
  setParagraphSpacing: (ps: EpubParagraphSpacing | ((prev: EpubParagraphSpacing) => EpubParagraphSpacing)) => void;
  
  // Progress & Navigation
  progress: number;
  setProgress: (p: number) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  totalPages: number;
  setTotalPages: (p: number) => void;
  locationsReady: boolean;
  setLocationsReady: (r: boolean) => void;
  currentSectionHref: string | null;
  setCurrentSectionHref: (href: string | null) => void;
  
  // Sidebars & UI State
  showSettings: boolean;
  setShowSettings: (s: boolean) => void;
  showToc: boolean;
  setShowToc: (s: boolean) => void;
  showSearch: boolean;
  setShowSearch: (s: boolean) => void;
  showNotebook: boolean;
  setShowNotebook: (s: boolean) => void;
  
  // Data
  toc: TocItem[];
  setToc: (t: TocItem[]) => void;
  bookmarks: LibraryBookmark[];
  setBookmarks: React.Dispatch<React.SetStateAction<LibraryBookmark[]>>;
  highlights: LibraryHighlight[];
  setHighlights: React.Dispatch<React.SetStateAction<LibraryHighlight[]>>;
  
  // Selection
  selection: { cfiRange: string, text: string, rect: DOMRect, existingHighlightId?: string, context?: string } | null;
  setSelection: (s: { cfiRange: string, text: string, rect: DOMRect, existingHighlightId?: string, context?: string } | null) => void;
  noteMode: string | null;
  setNoteMode: (m: string | null) => void;
  noteText: string;
  setNoteText: (t: string) => void;
}

const EpubContext = createContext<EpubContextType | undefined>(undefined);

export function EpubProvider({ children, book }: { children: ReactNode, book: LibraryBook }) {
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [epubBook, setEpubBook] = useState<Book | null>(null);
  
  interface EpubReadingPrefs {
    fontSize?: number;
    readingMode?: ReadingMode;
    fontFamily?: 'sans' | 'serif' | 'opendyslexic' | 'original';
    scrollMode?: boolean;
    textWidth?: 'narrow' | 'medium' | 'full';
    lineHeight?: EpubLineHeight;
    textAlign?: EpubTextAlign;
    paragraphSpacing?: EpubParagraphSpacing;
  }

  let prefs: EpubReadingPrefs = {};
  if (book.reading_preferences) {
    try {
      prefs = JSON.parse(book.reading_preferences) as EpubReadingPrefs;
    } catch {
      prefs = {};
    }
  }
  const [fontSize, setFontSize] = useState(typeof prefs.fontSize === 'number' ? prefs.fontSize : 100);
  const [readingMode, setReadingModeState] = useState<ReadingMode>(
    prefs.readingMode && ['light', 'sepia', 'dark', 'mint'].includes(prefs.readingMode)
      ? prefs.readingMode
      : getSettings().defaultReadingMode || 'light'
  );

  const setReadingMode = (mode: ReadingMode | ((prev: ReadingMode) => ReadingMode)) => {
    let newModeValue: ReadingMode;
    setReadingModeState(prev => {
      newModeValue = typeof mode === 'function' ? mode(prev) : mode;
      return newModeValue;
    });
    // Use setTimeout to ensure this side-effect runs outside the React render cycle
    setTimeout(() => {
      if (newModeValue) {
        saveSettings({ ...getSettings(), defaultReadingMode: newModeValue });
      }
    }, 0);
  };
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'opendyslexic' | 'original'>(
    prefs.fontFamily && ['sans', 'serif', 'opendyslexic', 'original'].includes(prefs.fontFamily)
      ? prefs.fontFamily
      : 'original'
  );
  const [originalFontName, setOriginalFontName] = useState<string | null>(null);
  const [detectedFontSizePx, setDetectedFontSizePx] = useState<string | null>(null);
  const [scrollMode, setScrollModeState] = useState<boolean>(
    typeof prefs.scrollMode === 'boolean'
      ? prefs.scrollMode
      : (getSettings().defaultScrollMode ?? false)
  );

  const setScrollMode = (mode: boolean | ((prev: boolean) => boolean)) => {
    let newModeValue: boolean;
    setScrollModeState(prev => {
      newModeValue = typeof mode === 'function' ? mode(prev) : mode;
      return newModeValue;
    });
    setTimeout(() => {
      saveSettings({ ...getSettings(), defaultScrollMode: newModeValue });
    }, 0);
  };
  const [textWidthState, setTextWidthState] = useState<'narrow' | 'medium' | 'full'>(
    prefs.textWidth && ['narrow', 'medium', 'full'].includes(prefs.textWidth)
      ? prefs.textWidth
      : getSettings().defaultTextWidth || 'medium'
  );
  const setTextWidth = (w: 'narrow' | 'medium' | 'full' | ((prev: 'narrow' | 'medium' | 'full') => 'narrow' | 'medium' | 'full')) => {
    let newWidthValue: 'narrow' | 'medium' | 'full';
    setTextWidthState(prev => {
      newWidthValue = typeof w === 'function' ? w(prev) : w;
      return newWidthValue;
    });
    setTimeout(() => {
      if (newWidthValue) {
        saveSettings({ ...getSettings(), defaultTextWidth: newWidthValue });
      }
    }, 0);
  };

  const [lineHeightState, setLineHeightState] = useState<EpubLineHeight>(
    prefs.lineHeight && ['compact', 'normal', 'relaxed'].includes(prefs.lineHeight)
      ? prefs.lineHeight
      : (getSettings().defaultLineHeight || 'normal')
  );
  const setLineHeight = (lh: EpubLineHeight | ((prev: EpubLineHeight) => EpubLineHeight)) => {
    let newLhValue: EpubLineHeight;
    setLineHeightState(prev => {
      newLhValue = typeof lh === 'function' ? lh(prev) : lh;
      return newLhValue;
    });
    setTimeout(() => {
      if (newLhValue) {
        saveSettings({ ...getSettings(), defaultLineHeight: newLhValue });
      }
    }, 0);
  };

  const [textAlignState, setTextAlignState] = useState<EpubTextAlign>(
    prefs.textAlign && ['justify', 'left'].includes(prefs.textAlign)
      ? prefs.textAlign
      : (getSettings().defaultTextAlign || 'justify')
  );
  const setTextAlign = (ta: EpubTextAlign | ((prev: EpubTextAlign) => EpubTextAlign)) => {
    let newTaValue: EpubTextAlign;
    setTextAlignState(prev => {
      newTaValue = typeof ta === 'function' ? ta(prev) : ta;
      return newTaValue;
    });
    setTimeout(() => {
      if (newTaValue) {
        saveSettings({ ...getSettings(), defaultTextAlign: newTaValue });
      }
    }, 0);
  };

  const [paragraphSpacingState, setParagraphSpacingState] = useState<EpubParagraphSpacing>(
    prefs.paragraphSpacing && ['compact', 'spaced'].includes(prefs.paragraphSpacing)
      ? prefs.paragraphSpacing
      : (getSettings().defaultParagraphSpacing || 'compact')
  );
  const setParagraphSpacing = (ps: EpubParagraphSpacing | ((prev: EpubParagraphSpacing) => EpubParagraphSpacing)) => {
    let newPsValue: EpubParagraphSpacing;
    setParagraphSpacingState(prev => {
      newPsValue = typeof ps === 'function' ? ps(prev) : ps;
      return newPsValue;
    });
    setTimeout(() => {
      if (newPsValue) {
        saveSettings({ ...getSettings(), defaultParagraphSpacing: newPsValue });
      }
    }, 0);
  };
  
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(book.total_pages || 0);
  const [locationsReady, setLocationsReady] = useState(Boolean(book.epub_locations && (book.total_pages || 0) > 0));
  const [currentSectionHref, setCurrentSectionHref] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  
  const [toc, setToc] = useState<TocItem[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  
  const [selection, setSelection] = useState<EpubContextType['selection']>(null);
  const [noteMode, setNoteMode] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  return (
    <EpubContext.Provider value={{
      book,
      rendition, setRendition,
      epubBook, setEpubBook,
      fontSize, setFontSize,
      readingMode, setReadingMode,
      fontFamily, setFontFamily,
      originalFontName, setOriginalFontName,
      detectedFontSizePx, setDetectedFontSizePx,
      scrollMode, setScrollMode,
      textWidth: textWidthState, setTextWidth,
      lineHeight: lineHeightState, setLineHeight,
      textAlign: textAlignState, setTextAlign,
      paragraphSpacing: paragraphSpacingState, setParagraphSpacing,
      progress, setProgress,
      currentPage, setCurrentPage,
      totalPages, setTotalPages,
      locationsReady, setLocationsReady,
      currentSectionHref, setCurrentSectionHref,
      showSettings, setShowSettings,
      showToc, setShowToc,
      showSearch, setShowSearch,
      showNotebook, setShowNotebook,
      toc, setToc,
      bookmarks, setBookmarks,
      highlights, setHighlights,
      selection, setSelection,
      noteMode, setNoteMode,
      noteText, setNoteText
    }}>
      {children}
    </EpubContext.Provider>
  );
}

export function useEpub() {
  const context = useContext(EpubContext);
  if (context === undefined) {
    throw new Error('useEpub must be used within an EpubProvider');
  }
  return context;
}

