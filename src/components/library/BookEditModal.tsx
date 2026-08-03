import { useState, useRef, useEffect } from 'react';
import { X, Plus, Palette, Image as ImageIcon, FileText, Upload, FileCode2, Loader2 } from 'lucide-react';
import { extractPdfCover } from '../../utils/pdf-cover';
import type { LibraryBook, LibraryCollection, ReadingStatus } from '../../types';
import { Portal } from '../ui/Portal';

interface BookEditModalProps {
  book: LibraryBook;
  allBooks: LibraryBook[];
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

const compressBase64Image = (base64: string, maxWidth = 300, maxHeight = 400, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

export default function BookEditModal({
  book,
  allBooks,
  collections,
  bookCollections,
  onSave,
  onClose,
}: BookEditModalProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [publisher, setPublisher] = useState(book.publisher || '');
  const [publishedYear, setPublishedYear] = useState<string>(book.published_year?.toString() || '');
  const [language, setLanguage] = useState(book.language || '');
  const [status, setStatus] = useState<ReadingStatus>(book.reading_status);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(bookCollections);
  const [coverImage, setCoverImage] = useState(book.cover_image || '');
  const [loading, setLoading] = useState(false);
  
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [extractingCover, setExtractingCover] = useState(false);
  const coverMenuRef = useRef<HTMLDivElement>(null);

  const uniqueAuthors = Array.from(new Set(allBooks.map(b => b.author).filter(Boolean)));
  const uniquePublishers = Array.from(new Set(allBooks.map(b => b.publisher).filter(Boolean)));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (coverMenuRef.current && !coverMenuRef.current.contains(event.target as Node)) {
        setShowCoverMenu(false);
      }
    };
    if (showCoverMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCoverMenu]);

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
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressed = await compressBase64Image(base64);
      setCoverImage(compressed);
    };
    reader.readAsDataURL(file);
    setShowCoverMenu(false);
  };

  const handleExtractCover = async () => {
    if (!book.file_path) return;
    
    setShowCoverMenu(false);
    setExtractingCover(true);
    try {
      if (!window.api?.library?.getBookFile) {
        throw new Error("API de biblioteca não disponível.");
      }
      
      const fileData = await window.api.library.getBookFile(book.id);
      if (!fileData) {
        throw new Error("Arquivo PDF não encontrado localmente.");
      }
      
      const base64 = await extractPdfCover(fileData);
      const compressed = await compressBase64Image(base64);
      setCoverImage(compressed);
    } catch (err) {
      console.error('Falha ao extrair capa', err);
      alert('Erro ao extrair capa do PDF. O arquivo pode estar corrompido, não baixado, ou não suportado.');
    } finally {
      setExtractingCover(false);
    }
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
      // Normalize author and publisher to avoid case-sensitive duplication
      const authorMatch = uniqueAuthors.find(a => a.toLowerCase() === author.trim().toLowerCase());
      const finalAuthor = authorMatch || author.trim();

      const publisherMatch = uniquePublishers.find(p => p.toLowerCase() === publisher.trim().toLowerCase());
      const finalPublisher = publisherMatch || publisher.trim();

      // Update book details
      await window.api.library.updateBook({
        id: book.id,
        title: title.trim(),
        author: finalAuthor,
        publisher: finalPublisher,
        published_year: publishedYear.trim() ? parseInt(publishedYear.trim(), 10) : null,
        language: language.trim() || null,
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
    <Portal>
      <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <h2 className="text-lg font-semibold text-dark-text">Editar Livro</h2>
          <button
            onClick={onClose}
            className="p-1 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            {/* Cover Image */}
            <div className="flex gap-4 items-start">
              <div className="relative w-24 h-32 rounded-lg bg-dark-bg border border-white/10 flex items-center justify-center overflow-visible shrink-0 group">
                <div className="w-full h-full overflow-hidden rounded-lg flex items-center justify-center">
                  {coverImage && !extractingCover ? (
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  ) : extractingCover ? (
                    <Loader2 size={24} className="text-brand-400 animate-spin" />
                  ) : (
                    <FileText size={32} className="text-dark-subtext" />
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowCoverMenu(!showCoverMenu)}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
                >
                  <ImageIcon size={20} className="text-white mb-1" />
                  <span className="text-[10px] text-white font-medium">Trocar</span>
                </button>

                {/* Cover Dropdown Menu */}
                {showCoverMenu && (
                  <div
                    ref={coverMenuRef}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[160px] animate-scale-in"
                  >
                    <label className="w-full text-left px-3 py-2 text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer">
                      <Upload size={14} />
                      Fazer Upload
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    </label>
                    
                    {book.file_path && (
                      <>
                        <div className="border-t border-white/5 my-1" />
                        <button
                          type="button"
                          onClick={handleExtractCover}
                          className="w-full text-left px-3 py-2 text-sm text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 flex items-center gap-2 transition-colors"
                        >
                          <FileCode2 size={14} />
                          Extrair do PDF
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col gap-4">
                  {/* Datalists for Suggestions */}
                  <datalist id="author-suggestions">
                    {uniqueAuthors.map(a => <option key={a} value={a} />)}
                  </datalist>
                  <datalist id="publisher-suggestions">
                    {uniquePublishers.map(p => <option key={p} value={p} />)}
                  </datalist>

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
                      list="author-suggestions"
                      className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none transition-colors"
                    />
                  </div>

                  {/* Publisher */}
                  <div>
                    <label className="block text-xs text-dark-subtext mb-1.5">Editora</label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      placeholder="Nome da editora"
                      list="publisher-suggestions"
                      className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none transition-colors"
                    />
                  </div>

                  <div className="flex gap-4">
                    {/* Published Year */}
                    <div className="flex-1">
                      <label className="block text-xs text-dark-subtext mb-1.5">Ano</label>
                      <input
                        type="number"
                        value={publishedYear}
                        onChange={(e) => setPublishedYear(e.target.value)}
                        placeholder="Ex: 2023"
                        className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none transition-colors"
                      />
                    </div>

                    {/* Language */}
                    <div className="flex-1">
                      <label className="block text-xs text-dark-subtext mb-1.5">Idioma</label>
                      <input
                        type="text"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        placeholder="Ex: PT-BR"
                        className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text focus:border-brand-500/50 outline-none transition-colors"
                      />
                    </div>
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 p-4 pt-4 border-t border-white/5 shrink-0 bg-dark-card">
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
    </Portal>
  );
}
