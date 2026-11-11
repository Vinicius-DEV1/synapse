import { useState, useEffect } from 'react';
import { Folder, MoreVertical, Pencil, Trash2, Plus, BookOpen, Layers } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { LibraryBook, LibraryCollection } from '../../../types';

interface LibraryCollectionCardProps {
  collection: LibraryCollection;
  books: LibraryBook[];
  onSelect: (collectionId: string) => void;
  onEdit?: (collection: LibraryCollection) => void;
  onDelete?: (collectionId: string) => void;
}

function MiniCover({ book }: { book: LibraryBook }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [book.cover_image]);

  const isInvalid = !book.cover_image || hasError || book.cover_image.startsWith('blob:');

  if (isInvalid) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900/60 to-dark-bg p-2 text-center select-none">
        <BookOpen size={20} className="text-brand-400/70 mb-1" />
        <span className="text-[10px] text-white/70 line-clamp-2 font-medium leading-tight">
          {book.title}
        </span>
      </div>
    );
  }

  return (
    <img
      src={book.cover_image}
      alt={book.title}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover"
      draggable={false}
    />
  );
}

export function LibraryCollectionCard({
  collection,
  books,
  onSelect,
  onEdit,
  onDelete,
}: LibraryCollectionCardProps) {
  const collectionBooks = books.filter(
    (b) =>
      b.collections?.some((c) => c.id === collection.id) ||
      (b as { collection_id?: string | null }).collection_id === collection.id
  );
  const count = collectionBooks.length;
  const previewBooks = collectionBooks.slice(0, 3);
  const color = collection.color || '#6366f1';

  return (
    <div
      onClick={() => onSelect(collection.id)}
      className="group relative flex flex-col rounded-xl border border-white/5 bg-dark-card hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Visual Cover Stack / Canvas */}
      <div className="relative aspect-[3/4] bg-black/40 overflow-hidden select-none">
        {/* Subtle dynamic backdrop glow tinted with collection color */}
        <div
          className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${color} 0%, transparent 70%)`,
          }}
        />

        {count === 0 ? (
          /* Empty Collection State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110 shadow-lg"
              style={{
                backgroundColor: `${color}20`,
                borderColor: `${color}40`,
                borderWidth: '1px',
              }}
            >
              <Folder size={26} style={{ color }} />
            </div>
            <span className="text-xs font-medium text-white/60">Coleção vazia</span>
            <span className="text-[10px] text-white/40 mt-0.5">Clique para adicionar livros</span>
          </div>
        ) : previewBooks.length === 1 ? (
          /* Single Book Preview */
          <div className="absolute inset-4 rounded-lg overflow-hidden shadow-2xl border border-white/10 group-hover:-translate-y-1 transition-transform duration-300">
            <MiniCover book={previewBooks[0]} />
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
          </div>
        ) : previewBooks.length === 2 ? (
          /* Two Books Fan */
          <div className="absolute inset-0">
            {/* Book 2 (behind, tilted right) */}
            <div className="absolute top-3 right-4 left-8 bottom-5 rotate-[6deg] opacity-75 group-hover:rotate-[8deg] group-hover:translate-x-1 transition-all duration-300 rounded-md overflow-hidden shadow-lg border border-white/10">
              <MiniCover book={previewBooks[1]} />
              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
            </div>
            {/* Book 1 (front, straight) */}
            <div className="absolute top-5 left-5 right-7 bottom-3 rotate-0 opacity-100 group-hover:-translate-y-1 transition-all duration-300 rounded-lg overflow-hidden shadow-2xl border border-white/15">
              <MiniCover book={previewBooks[0]} />
              <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
            </div>
          </div>
        ) : (
          /* Three Books Stack Deck */
          <div className="absolute inset-0">
            {/* Book 3 (left tilt) */}
            <div className="absolute top-3 left-4 right-8 bottom-6 -rotate-6 opacity-65 group-hover:-rotate-8 group-hover:-translate-x-1 transition-all duration-300 rounded-md overflow-hidden shadow-md border border-white/10">
              <MiniCover book={previewBooks[2]} />
              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
            </div>
            {/* Book 2 (right tilt) */}
            <div className="absolute top-2 right-4 left-8 bottom-5 rotate-6 opacity-80 group-hover:rotate-8 group-hover:translate-x-1 transition-all duration-300 rounded-md overflow-hidden shadow-lg border border-white/10">
              <MiniCover book={previewBooks[1]} />
              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
            </div>
            {/* Book 1 (front centered) */}
            <div className="absolute top-5 left-6 right-6 bottom-3 rotate-0 opacity-100 group-hover:-translate-y-1 transition-all duration-300 rounded-lg overflow-hidden shadow-2xl border border-white/20">
              <MiniCover book={previewBooks[0]} />
              <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

        {/* Top Badges (Collection Color Indicator + Book Count) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
          <span
            className="w-2.5 h-2.5 rounded-full ring-2 ring-black/40"
            style={{ backgroundColor: color }}
          />
        </div>

        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white/90 shadow-sm flex items-center gap-1 pointer-events-none">
            <Layers size={10} style={{ color }} />
            {count} {count === 1 ? 'livro' : 'livros'}
          </span>

          {/* Context Menu Button */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md bg-black/50 backdrop-blur-md text-white/60 hover:text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Opções da coleção"
              >
                <MoreVertical size={14} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[160px] bg-dark-card border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95"
                sideOffset={4}
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                  onSelect={() => onSelect(collection.id)}
                >
                  <BookOpen size={14} />
                  Abrir coleção
                </DropdownMenu.Item>
                {onEdit && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                    onSelect={() => onEdit(collection)}
                  >
                    <Pencil size={14} />
                    Editar coleção
                  </DropdownMenu.Item>
                )}
                {onDelete && (
                  <>
                    <DropdownMenu.Separator className="h-px bg-white/10 my-1" />
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer outline-none transition-colors"
                      onSelect={() => onDelete(collection.id)}
                    >
                      <Trash2 size={14} />
                      Excluir coleção
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Collection Metadata Footer */}
      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white/95 group-hover:text-brand-400 transition-colors truncate flex-1">
            {collection.name}
          </h3>
        </div>
        <p className="text-[11px] text-dark-subtext truncate">
          {count > 0
            ? collectionBooks
                .slice(0, 2)
                .map((b) => b.title)
                .join(', ') + (count > 2 ? ` e +${count - 2}` : '')
            : 'Nenhum livro agrupado'}
        </p>
      </div>
    </div>
  );
}

interface NewCollectionCardProps {
  onClick: () => void;
}

export function NewCollectionCard({ onClick }: NewCollectionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Nova Coleção"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 hover:border-brand-400/50 cursor-pointer transition-all duration-300 hover:bg-brand-500/5 aspect-[3/4] select-none focus:outline-none focus:ring-2 focus:ring-brand-500/50"
    >
      <div className="flex flex-col items-center gap-2.5 text-dark-subtext group-hover:text-brand-400 transition-colors">
        <div className="p-3.5 rounded-full bg-white/5 group-hover:bg-brand-500/10 transition-all group-hover:scale-110 duration-300">
          <Plus size={26} />
        </div>
        <span className="text-sm font-medium">Nova Coleção</span>
        <span className="text-[11px] text-dark-subtext/70 -mt-1">Agrupar livros</span>
      </div>
    </div>
  );
}
