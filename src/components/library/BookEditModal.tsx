import { useState } from 'react';
import { X, Plus, Palette, Image as ImageIcon, FileText } from 'lucide-react';
import type { LibraryBook, LibraryCollection, ReadingStatus } from '../../types';

interface BookEditModalProps {
  book: LibraryBook;
  collections: LibraryCollection[];
  bookCollections: string[]; // collection IDs
  onSave: () => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'not_started', label: 'Não iniciado' },
  { value: 'reading', label: 'Lendo' },
  { value: 'finished', label: 'Concluído' },
];

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export default function BookEditModal({
  book,
  collections,
  bookCollections,
  onSave,
  onClose,
}: BookEditModalProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [status, setStatus] = useState<ReadingStatus>(book.reading_status);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(bookCollections);
  const [coverImage, setCoverImage] = useState(book.cover_image || '');
  const [loading, setLoading] = useState(false);

  // New collection form
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState(PRESET_COLORS[6]); // brand purple

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (JPG, PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCoverImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const toggleCollection = (id: string) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api?.library) return;

    setLoading(true);
    try {
      // Update book details
      await window.api.library.updateBook({
        id: book.id,
        title: title.trim(),
        author: author.trim(),
        reading_status: status,
        cover_image: coverImage,
      });

      // Create new collection if needed
      let finalCollections = [...selectedCollections];
      if (showNewCollection && newCollectionName.trim()) {
        const newCol = await window.api.library.createCollection({
          name: newCollectionName.trim(),
          color: newCollectionColor,
        });
        finalCollections.push(newCol.id);
      }

      // Set book collections
      await window.api.library.setBookCollections(book.id, finalCollections);

      await onSave();
    } catch (err) {
      console.error('Failed to save book', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-dark-text">Editar Livro</h2>
          <button
            onClick={onClose}
            className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {/* Cover Image */}
          <div className="flex gap-4 items-start">
            <div className="relative w-24 h-32 rounded-lg bg-dark-bg border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group">
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <FileText size={32} className="text-dark-subtext" />
              )}
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <ImageIcon size={20} className="text-white mb-1" />
                <span className="text-[10px] text-white font-medium">Trocar</span>
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
            </div>
            
            <div className="flex-1 flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-dark-subtext mb-1.5">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do livro"
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none transition-colors"
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-xs text-dark-subtext mb-1.5">Autor</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nome do autor"
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-dark-subtext mb-2">Status de leitura</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    status === opt.value
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                      : 'border-white/5 bg-dark-bg text-dark-subtext hover:text-dark-text hover:border-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Collections */}
          <div>
            <label className="block text-xs text-dark-subtext mb-2">Coleções</label>
            <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
              {collections.map((col) => (
                <label
                  key={col.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedCollections.includes(col.id)
                      ? 'bg-white/5 border border-white/10'
                      : 'hover:bg-white/3 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(col.id)}
                    onChange={() => toggleCollection(col.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      selectedCollections.includes(col.id)
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {selectedCollections.includes(col.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-sm text-dark-text">{col.name}</span>
                </label>
              ))}
            </div>

            {/* New Collection */}
            {!showNewCollection ? (
              <button
                type="button"
                onClick={() => setShowNewCollection(true)}
                className="flex items-center gap-1.5 mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Plus size={14} />
                Nova coleção...
              </button>
            ) : (
              <div className="mt-2 p-3 bg-dark-bg rounded-lg border border-white/5 flex flex-col gap-2.5 animate-fade-in">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Nome da coleção"
                  className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm text-dark-text focus:border-brand-500/50 outline-none transition-colors"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-dark-subtext flex-shrink-0" />
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCollectionColor(color)}
                        className={`w-5 h-5 rounded-full transition-all ${
                          newCollectionColor === color
                            ? 'ring-2 ring-white/50 scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCollection(false);
                    setNewCollectionName('');
                  }}
                  className="self-end text-xs text-dark-subtext hover:text-dark-text transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 rounded-lg text-sm text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50 shadow-lg shadow-brand-500/20"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
