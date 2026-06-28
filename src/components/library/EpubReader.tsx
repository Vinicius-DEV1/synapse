import React, { useState, useEffect, useRef } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { ArrowLeft, ZoomIn, ZoomOut, Sun, Moon, Settings, Menu, Bookmark, Search } from 'lucide-react';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../types';
import { getSettings } from '../../utils/settings';
import { getValidAccessToken, downloadFromDrive } from '../../services/drive';
import { decryptFile } from '../../services/storage';

interface EpubReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

export default function EpubReader({ book, onBack, onUpdateBook }: EpubReaderProps) {
  const [loading, setLoading] = useState(true);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  
  // Kindle-like settings
  const [fontSize, setFontSize] = useState(100);
  const [readingMode, setReadingMode] = useState<'light' | 'sepia' | 'dark'>('light');
  const [showSettings, setShowSettings] = useState(false);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);

  // Load EPUB
  useEffect(() => {
    let active = true;
    const loadBook = async () => {
      try {
        setLoading(true);
        let arrayBuffer: ArrayBuffer;

        if (book.drive_file_id) {
          const token = await getValidAccessToken();
          if (!token) throw new Error('Não autenticado no Google Drive');
          const blob = await downloadFromDrive(book.drive_file_id, token);
          arrayBuffer = await blob.arrayBuffer();
        } else if (book.file_path) {
          if (book.file_path.startsWith('file://')) {
            const res = await window.api.library.getBookFile(book.id);
            if (!res) throw new Error("Arquivo não encontrado no banco");
            const binaryString = atob(res);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            arrayBuffer = bytes.buffer;
          } else {
            // Decrypt se foi salvo usando E2EE antigo
            const bytes = await decryptFile(book.file_path);
            arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          }
        } else {
          throw new Error('Nenhum arquivo encontrado para este livro.');
        }

        if (!active) return;

        const epubBook = ePub(arrayBuffer);
        bookRef.current = epubBook;

        await epubBook.ready;
        if (!active) return;
        
        if (viewerRef.current) {
           const newRendition = epubBook.renderTo(viewerRef.current, {
             width: '100%',
             height: '100%',
             spread: 'none',
           });
           
           setRendition(newRendition);
           
           // Apply themes
           newRendition.themes.register('light', { 'body': { 'background': '#ffffff', 'color': '#333333' }});
           newRendition.themes.register('sepia', { 'body': { 'background': '#f4ecd8', 'color': '#5b4636' }});
           newRendition.themes.register('dark', { 'body': { 'background': '#1a1a1a', 'color': '#cccccc' }});
           
           newRendition.themes.select(readingMode);
           newRendition.themes.fontSize(`${fontSize}%`);
           
           if (book.last_read_page && typeof book.last_read_page === 'string') {
              await newRendition.display(book.last_read_page as string);
           } else {
              await newRendition.display();
           }

           newRendition.on('relocated', (location: any) => {
              if (!active) return;
              onUpdateBook({ last_read_page: location.start.cfi as any });
           });

           // Hooks for UI (hide settings on click)
           newRendition.on('click', () => {
              setShowSettings(false);
           });
        }
        setLoading(false);
      } catch (err: any) {
        console.error("EPUB Load Error:", err);
        if (active) {
          setEpubError(err.message || "Falha ao carregar EPUB");
          setLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      active = false;
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [book.id]);

  useEffect(() => {
    if (rendition) {
      rendition.themes.select(readingMode);
    }
  }, [readingMode, rendition]);

  useEffect(() => {
    if (rendition) {
      rendition.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize, rendition]);

  const handlePrev = () => rendition?.prev();
  const handleNext = () => rendition?.next();

  return (
    <div className={`h-full flex flex-col ${readingMode === 'dark' ? 'bg-[#0f0e17]' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}>
      {/* Barra Superior */}
      <div className={`flex-shrink-0 h-14 flex items-center justify-between px-4 z-20 shadow-sm border-b transition-colors
          ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
            readingMode === 'sepia' ? 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636]' : 
            'bg-white border-gray-200 text-gray-800'}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 
              ${readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5'}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate" title={book.title}>{book.title}</h1>
            <div className="text-xs opacity-70 truncate">{book.author || 'Desconhecido'}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? (readingMode==='dark'?'bg-gray-800':'bg-black/10') : (readingMode==='dark'?'hover:bg-gray-800':'hover:bg-black/5')}`}
          >
            <span className="font-serif font-bold text-lg leading-none">Aa</span>
          </button>
        </div>
      </div>

      {/* Menu Estilo Kindle */}
      {showSettings && (
        <div className={`absolute top-14 right-4 z-30 p-4 rounded-xl shadow-xl border animate-fade-in
          ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200 shadow-black/50' : 
            readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 
            'bg-white border-gray-200 text-gray-800'}`}>
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Tamanho da Fonte</div>
            <div className="flex items-center gap-4">
              <button onClick={() => setFontSize(Math.max(50, fontSize - 10))} className="p-2 border rounded-lg hover:bg-black/5">-</button>
              <span className="w-12 text-center">{fontSize}%</span>
              <button onClick={() => setFontSize(Math.min(300, fontSize + 10))} className="p-2 border rounded-lg hover:bg-black/5">+</button>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Tema</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setReadingMode('light')} className={`w-8 h-8 rounded-full bg-white border-2 ${readingMode === 'light' ? 'border-brand-500' : 'border-gray-200'}`} />
              <button onClick={() => setReadingMode('sepia')} className={`w-8 h-8 rounded-full bg-[#f4ecd8] border-2 ${readingMode === 'sepia' ? 'border-brand-500' : 'border-transparent'}`} />
              <button onClick={() => setReadingMode('dark')} className={`w-8 h-8 rounded-full bg-[#1a1a1a] border-2 ${readingMode === 'dark' ? 'border-brand-500' : 'border-transparent'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Viewer Core */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
          </div>
        )}
        
        {epubError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500 p-8 text-center bg-dark-bg">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <ArrowLeft size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Erro ao carregar EPUB</h3>
            <p className="opacity-80 max-w-md">{epubError}</p>
            <button onClick={onBack} className="mt-6 px-6 py-2 bg-dark-surface hover:bg-dark-border rounded-lg text-dark-text transition-colors">
              Voltar à Biblioteca
            </button>
          </div>
        )}

        <button onClick={handlePrev} className={`absolute left-0 top-0 bottom-0 w-16 z-10 transition-opacity opacity-0 hover:opacity-100 flex items-center justify-center ${readingMode === 'dark' ? 'bg-gradient-to-r from-black/50 to-transparent text-white' : 'bg-gradient-to-r from-black/10 to-transparent text-black'}`}>
          <ArrowLeft size={32} />
        </button>
        
        <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto" style={{ padding: '0 40px' }} />

        <button onClick={handleNext} className={`absolute right-0 top-0 bottom-0 w-16 z-10 transition-opacity opacity-0 hover:opacity-100 flex items-center justify-center ${readingMode === 'dark' ? 'bg-gradient-to-l from-black/50 to-transparent text-white' : 'bg-gradient-to-l from-black/10 to-transparent text-black'}`}>
           <ArrowLeft size={32} className="rotate-180" />
        </button>
      </div>
    </div>
  );
}
