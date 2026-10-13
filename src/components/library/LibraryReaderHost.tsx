import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { LibraryBook } from '../../types';
import { isBookEpub } from '../../utils/book-format';

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
  const isEpub = isBookEpub(book);

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
          key={`epub-${book.id}`}
          book={book}
          onBack={onBack}
          onUpdateBook={onUpdateBook}
        />
      ) : (
        <PdfReader
          key={`pdf-${book.id}`}
          book={book}
          onBack={onBack}
          onUpdateBook={onUpdateBook}
        />
      )}
    </Suspense>
  );
};
