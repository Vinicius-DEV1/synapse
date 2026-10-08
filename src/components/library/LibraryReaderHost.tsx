import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { LibraryBook } from '../../types';

const PdfReader = lazy(() => import('./pdf/PdfReader'));
const EpubReader = lazy(() => import('./epub/EpubReader'));

interface LibraryReaderHostProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

export const LibraryReaderHost: React.FC<LibraryReaderHostProps> = ({
  book,
  onBack,
  onUpdateBook,
}) => {
  const filePathLower = (book.file_path || '').toLowerCase();
  const titleLower = (book.title || '').toLowerCase();
  const origNameLower = (book.original_name || '').toLowerCase();

  const isEpub =
    filePathLower.endsWith('.epub') ||
    filePathLower.endsWith('.epub.enc') ||
    filePathLower.includes('.epub.') ||
    titleLower.endsWith('.epub') ||
    origNameLower.endsWith('.epub');

  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-dark-bg">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      }
    >
      {isEpub ? (
        <EpubReader
          book={book}
          onBack={onBack}
          onUpdateBook={onUpdateBook}
        />
      ) : (
        <PdfReader
          book={book}
          onBack={onBack}
          onUpdateBook={onUpdateBook}
        />
      )}
    </Suspense>
  );
};
