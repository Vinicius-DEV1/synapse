import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Rendition, Book } from 'epubjs';
import type { LibraryBook, LibraryHighlight, LibraryBookmark, ReadingMode } from '../../../types';
import { getSettings, saveSettings } from '../../../utils/settings';

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
  
  // Progress & Navigation
  progress: number;
  setProgress: (p: number) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  totalPages: number;
  setTotalPages: (p: number) => void;
  locationsReady: boolean;
  setLocationsReady: (r: boolean) => void;
  
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
  toc: any[];
  setToc: (t: any[]) => void;
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
  
  const prefs = book.reading_preferences ? JSON.parse(book.reading_preferences) : {};
    const [fontSize, setFontSize] = useState(prefs.fontSize || 100);
  const [readingMode, setReadingModeState] = useState<ReadingMode>(prefs.readingMode || getSettings().defaultReadingMode || 'light');

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
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'opendyslexic' | 'original'>('original');
  const [originalFontName, setOriginalFontName] = useState<string | null>(null);
  const [detectedFontSizePx, setDetectedFontSizePx] = useState<string | null>(null);
  const [scrollMode, setScrollMode] = useState(false);
  
  const [textWidthState, setTextWidthState] = useState<'narrow' | 'medium' | 'full'>(prefs.textWidth || getSettings().defaultTextWidth || 'medium');
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
  
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [locationsReady, setLocationsReady] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  
  const [toc, setToc] = useState<any[]>([]);
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
      progress, setProgress,
      currentPage, setCurrentPage,
      totalPages, setTotalPages,
      locationsReady, setLocationsReady,
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

