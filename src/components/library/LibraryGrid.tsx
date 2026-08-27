import { useState, useRef, useEffect } from 'react';
import {
  FileText, Plus, MoreVertical, BookOpen, CheckCircle2,
  Circle, Pencil, Trash2, BookMarked, Cloud, CloudDownload, HardDrive, CloudOff
} from 'lucide-react';
import type { LibraryBook, LibraryCollection, ReadingStatus } from '../../types';

interface LibraryGridProps {
  books: LibraryBook[];
  collections: LibraryCollection[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectBook: (book: LibraryBook) => void;
  onImportBook: () => void;
  onEditBook: (book: LibraryBook) => void;
  onDeleteBook: (id: string) => void;
  onStatusChange: (book: LibraryBook, status: ReadingStatus) => void;
  onEvictBook?: (id: string) => void;
}

const STATUS_CONFIG: Record<ReadingStatus, { label: string; color: string; icon: typeof Circle }> = {
  not_started: { label: 'Não iniciado', color: 'text-gray-400', icon: Circle },
  reading: { label: 'Lendo', color: 'text-emerald-400', icon: BookOpen },
  finished: { label: 'Concluído', color: 'text-brand-400', icon: CheckCircle2 },
};

export default function LibraryGrid({
  books,
  collections: _collections,
  selectedIds,
  onToggleSelect,
  onSelectBook,
  onImportBook,
  onEditBook,
  onDeleteBook,
  onStatusChange,
  onEvictBook,
}: LibraryGridProps) {
  const [menuBookId, setMenuBookId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuBookId(null);
      }
    };
    if (menuBookId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuBookId]);

  const getProgress = (book: LibraryBook): number => {
    if (!book.total_pages || book.total_pages === 0) return 0;
    
    let page = (book as any).current_page || 0;
    if (typeof book.last_read_page === 'number') {
      page = book.last_read_page;
    } else if (typeof book.last_read_page === 'string' && !(book.last_read_page as any).includes('epubcfi')) {
      const parsed = parseInt(book.last_read_page, 10);
      if (!isNaN(parsed)) page = parsed;
    }
    
    if (!page || page <= 0) return 0;
    return Math.min(100, Math.round((page / book.total_pages) * 100));
  };

  return (
    <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
      {/* Book Cards */}
      {books.map((book, index) => {
        const progress = getProgress(book);
        const status = STATUS_CONFIG[book.reading_status || 'not_started'];
        const isEpub = (book.file_path || '').toLowerCase().includes('.epub') ||
                       (book.title || '').toLowerCase().endsWith('.epub') ||
                       (book.original_name || '').toLowerCase().endsWith('.epub');
        const isSelected = selectedIds?.has(book.id);
        const isLocal = book.is_local !== false;
        const isSynced = !!book.drive_file_id;
        const bookCollections = book.collections || [];

        return (
          <div
            key={book.id}
            className={`group relative flex flex-col rounded-xl border bg-dark-card transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 hover:border-brand-400/40 cursor-pointer ${
              isSelected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-white/5'
            }`}
            style={{
              animation: `fade-in 0.3s ease-out ${index * 50}ms both`,
            }}
            onClick={() => {
              if (!isLocal) {
                if (confirm(`O arquivo "${book.title}" não está salvo localmente. Ele será baixado da nuvem. Deseja continuar?`)) {
                  onSelectBook(book);
                }
              } else {
                onSelectBook(book);
              }
            }}
          >
            {/* Cover */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-t-xl">
              {/* Checkbox (multi-select) */}
              {selectedIds && onToggleSelect && (
                <div
                  className="absolute top-2 left-2 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(book.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-white/30 bg-dark-bg/80 text-brand-500 focus:ring-brand-500 cursor-pointer shadow-md"
                  />
                </div>
              )}
              {book.cover_image ? (
                <img
                  src={book.cover_image}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/30 to-brand-700/30">
                  <FileText size={40} className="text-brand-400/60" />
                </div>
              )}

              {/* Book spine shadow (3D effect) */}
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />

              {/* Format Badge (PDF / EPUB) */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
                <span
                  className={`px-1.5 py-0.5 rounded-[5px] text-[9px] font-bold tracking-wider uppercase border backdrop-blur-md shadow-sm ${
                    isEpub
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {isEpub ? 'EPUB' : 'PDF'}
                </span>
                
                {/* Cloud Status Badge */}
                <div className="px-1.5 py-1 rounded-[5px] bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-sm flex items-center justify-center">
                  {!isLocal && isSynced ? (
                    <CloudDownload size={12} className="text-blue-400" />
                  ) : isLocal && isSynced ? (
                    <Cloud size={12} className="text-emerald-400" />
                  ) : (
                    <HardDrive size={12} className="text-brand-400" />
                  )}
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuBookId(menuBookId === book.id ? null : book.id);
                  setConfirmDeleteId(null);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
              >
                <MoreVertical size={16} />
              </button>
              
              {/* Progress overlay at bottom of cover */}
              {progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <div
                    className="h-full bg-brand-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Dropdown Menu - Movido para fora do cover para não ser cortado */}
            {menuBookId === book.id && (
              <div
                ref={menuRef}
                className="absolute top-10 right-2 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setMenuBookId(null);
                    onEditBook(book);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 flex items-center gap-2 transition-colors"
                >
                  <Pencil size={14} />
                  Editar
                </button>

                <div className="border-t border-white/5 my-1" />

                {book.reading_status !== 'not_started' && (
                  <button
                    onClick={() => {
                      onStatusChange(book, 'not_started');
                      setMenuBookId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <Circle size={14} />
                    Marcar como Não iniciado
                  </button>
                )}
                {book.reading_status !== 'reading' && (
                  <button
                    onClick={() => {
                      onStatusChange(book, 'reading');
                      setMenuBookId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <BookOpen size={14} />
                    Marcar como Lendo
                  </button>
                )}
                {book.reading_status !== 'finished' && (
                  <button
                    onClick={() => {
                      onStatusChange(book, 'finished');
                      setMenuBookId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    Marcar como Concluído
                  </button>
                )}

                {isLocal && onEvictBook && (
                  <button
                    onClick={() => {
                      onEvictBook(book.id);
                      setMenuBookId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 transition-colors"
                  >
                    <CloudOff size={14} />
                    Remover Download Local
                  </button>
                )}

                <div className="border-t border-white/5 my-1" />

                {confirmDeleteId === book.id ? (
                  <div className="px-3 py-2 flex flex-col gap-2">
                    <span className="text-xs text-red-400">Tem certeza?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onDeleteBook(book.id);
                          setMenuBookId(null);
                          setConfirmDeleteId(null);
                        }}
                        className="flex-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 px-2 py-1 text-xs rounded bg-white/5 text-dark-subtext hover:bg-white/10 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(book.id)}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex flex-col gap-1.5 p-3 flex-1">
              <h3 className="text-sm font-medium text-dark-text leading-tight line-clamp-2">
                {book.title}
              </h3>
              {book.author && (
                <p className="text-xs text-dark-subtext truncate">{book.author}</p>
              )}

              {/* Status badge */}
              <div className="flex items-center gap-1.5 mt-auto pt-1">
                <status.icon size={12} className={status.color} />
                <span className={`text-[11px] ${status.color}`}>{status.label}</span>
                {progress > 0 && progress < 100 && (
                  <span className="text-[10px] text-dark-subtext ml-auto">{progress}%</span>
                )}
              </div>

              {/* Collection pills */}
              {bookCollections.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  {bookCollections.slice(0, 2).map((col) => (
                    <span
                      key={col.id}
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: col.color + '20',
                        color: col.color,
                      }}
                    >
                      {col.name}
                    </span>
                  ))}
                  {bookCollections.length > 2 && (
                    <span className="text-[10px] text-dark-subtext">
                      +{bookCollections.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Import Card */}
      <div
        onClick={onImportBook}
        className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 hover:border-brand-400/50 cursor-pointer transition-all duration-300 hover:bg-brand-500/5 aspect-[3/4] sm:min-h-[280px]"
        style={{
          animation: `fade-in 0.3s ease-out ${books.length * 50}ms both`,
        }}
      >
        <div className="flex flex-col items-center gap-3 text-dark-subtext group-hover:text-brand-400 transition-colors">
          <div className="p-4 rounded-full bg-white/5 group-hover:bg-brand-500/10 transition-all group-hover:scale-110 duration-300">
            <Plus size={28} />
          </div>
          <span className="text-sm font-medium">Importar Livro</span>
          <span className="text-[11px] text-dark-subtext/70 -mt-1.5">PDF ou EPUB</span>
        </div>
      </div>

      {/* Empty State */}
      {books.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-brand-500/10 mb-4">
            <BookMarked size={40} className="text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-text mb-1">
            Sua biblioteca está vazia
          </h3>
          <p className="text-sm text-dark-subtext max-w-xs">
            Importe seu primeiro livro (PDF ou EPUB) para começar a organizar sua leitura.
          </p>
        </div>
      )}
    </div>
  );
}
