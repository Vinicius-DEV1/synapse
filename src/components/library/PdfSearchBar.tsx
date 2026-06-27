import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, X, Loader2 } from 'lucide-react';

interface SearchResult {
  pageNumber: number;
  text: string;
  index: number;
}

interface PdfSearchBarProps {
  pdfDoc: any;
  bookId: string;
  totalPages: number;
  currentPage: number;
  onNavigateToPage: (page: number) => void;
  onHighlightResults: (results: SearchResult[]) => void;
  onClose: () => void;
}

export default function PdfSearchBar({
  pdfDoc,
  bookId,
  totalPages,
  currentPage: _currentPage,
  onNavigateToPage,
  onHighlightResults,
  onClose,
}: PdfSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<any>(null);
  const abortRef = useRef(false);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    abortRef.current = true;

    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2 || !pdfDoc) {
      setResults([]);
      setCurrentResultIndex(0);
      onHighlightResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(trimmed);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, pdfDoc]);

  const performSearch = useCallback(async (searchText: string) => {
    if (!pdfDoc) return;
    setSearching(true);
    abortRef.current = false;

    const foundResults: SearchResult[] = [];

    try {
      for (let i = 1; i <= totalPages; i++) {
        if (abortRef.current) break;

        let pageText = '';

        try {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        } catch {
          // If PDF text extraction fails, try OCR cache
        }

        // If no text from PDF, check OCR cache
        if (!pageText.trim()) {
          try {
            const ocrCache = await window.api.library.getOcrCache(bookId, i);
            if (ocrCache) {
              pageText = ocrCache.text_content;
            }
          } catch {
            // Ignore OCR cache errors
          }
        }

        if (!pageText) continue;

        const lowerText = pageText.toLowerCase();
        let startIdx = 0;

        while (true) {
          const idx = lowerText.indexOf(searchText, startIdx);
          if (idx === -1) break;

          const contextStart = Math.max(0, idx - 30);
          const contextEnd = Math.min(pageText.length, idx + searchText.length + 30);
          const contextText = (contextStart > 0 ? '...' : '') +
            pageText.substring(contextStart, contextEnd) +
            (contextEnd < pageText.length ? '...' : '');

          foundResults.push({
            pageNumber: i,
            text: contextText,
            index: idx,
          });

          startIdx = idx + 1;
        }
      }
    } catch (err) {
      console.error('Erro na busca:', err);
    }

    if (!abortRef.current) {
      setResults(foundResults);
      setCurrentResultIndex(0);
      onHighlightResults(foundResults);
      setSearching(false);

      // Navigate to first result
      if (foundResults.length > 0) {
        onNavigateToPage(foundResults[0].pageNumber);
      }
    }
  }, [pdfDoc, totalPages, bookId, onHighlightResults, onNavigateToPage]);

  const navigateResult = useCallback((direction: 'prev' | 'next') => {
    if (results.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentResultIndex + 1) % results.length;
    } else {
      newIndex = (currentResultIndex - 1 + results.length) % results.length;
    }

    setCurrentResultIndex(newIndex);
    onNavigateToPage(results[newIndex].pageNumber);
  }, [results, currentResultIndex, onNavigateToPage]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        navigateResult('prev');
      } else {
        navigateResult('next');
      }
    }
  }, [navigateResult]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-dark-card/95 backdrop-blur-md border-b border-white/5 animate-fade-in">
      {/* Search input */}
      <div className="flex items-center flex-1 max-w-md bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-brand-500/50 transition-colors">
        <Search size={14} className="text-dark-subtext mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Buscar no documento..."
          className="flex-1 bg-transparent text-sm text-dark-text placeholder:text-dark-subtext/50 focus:outline-none"
        />
        {searching && (
          <Loader2 size={14} className="text-brand-400 animate-spin ml-2" />
        )}
      </div>

      {/* Result counter */}
      {query.trim().length >= 2 && !searching && (
        <span className="text-xs text-dark-subtext whitespace-nowrap min-w-[60px] text-center">
          {results.length > 0
            ? `${currentResultIndex + 1} de ${results.length}`
            : 'Sem resultados'
          }
        </span>
      )}

      {/* Navigation buttons */}
      {results.length > 0 && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigateResult('prev')}
            className="p-1 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-dark-text transition-all active:scale-90"
            title="Resultado anterior (Shift+Enter)"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => navigateResult('next')}
            className="p-1 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-dark-text transition-all active:scale-90"
            title="Próximo resultado (Enter)"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-dark-text transition-all active:scale-90"
        title="Fechar busca (Esc)"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export type { SearchResult, PdfSearchBarProps };
