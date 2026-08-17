import { BookOpen, ChevronDown } from 'lucide-react';

interface LibraryAuthorDropdownProps {
  authors: string[];
  selectedAuthor: string | null;
  setSelectedAuthor: (a: string | null) => void;
  showAuthorDropdown: boolean;
  setShowAuthorDropdown: (show: boolean) => void;
  onOpen: () => void;
}

export function LibraryAuthorDropdown({
  authors,
  selectedAuthor,
  setSelectedAuthor,
  showAuthorDropdown,
  setShowAuthorDropdown,
  onOpen,
}: LibraryAuthorDropdownProps) {
  if (authors.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
          selectedAuthor
            ? 'border-brand-500/30 text-brand-400 bg-brand-500/10'
            : 'border-white/5 text-dark-subtext hover:text-dark-text hover:bg-white/5'
        }`}
      >
        <BookOpen size={14} className="opacity-70" />
        <span className="truncate max-w-[120px]">
          {selectedAuthor || 'Autor'}
        </span>
        <ChevronDown size={14} />
      </button>
      {showAuthorDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowAuthorDropdown(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[200px] max-h-64 overflow-y-auto animate-scale-in">
            <button
              onClick={() => {
                setSelectedAuthor(null);
                setShowAuthorDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                !selectedAuthor
                  ? 'text-brand-400 bg-brand-500/10'
                  : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
              }`}
            >
              Todos os autores
            </button>
            {authors.map((author) => (
              <button
                key={author}
                onClick={() => {
                  setSelectedAuthor(author);
                  setShowAuthorDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  selectedAuthor === author
                    ? 'text-brand-400 bg-brand-500/10'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                }`}
              >
                {author}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
