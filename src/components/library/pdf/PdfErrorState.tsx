import { FileQuestion, FolderUp, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';
import type { LibraryBook } from '../../../types';

interface PdfErrorStateProps {
  book: LibraryBook;
  reattachError: string | null;
  isReattaching: boolean;
  isDeleting: boolean;
  confirmDelete: boolean;
  onReattach: () => void;
  onReload: () => void;
  onBack: () => void;
  onDeleteBook: () => void;
  setConfirmDelete: (val: boolean) => void;
}

export function PdfErrorState({
  book,
  reattachError,
  isReattaching,
  isDeleting,
  confirmDelete,
  onReattach,
  onReload,
  onBack,
  onDeleteBook,
  setConfirmDelete,
}: PdfErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-dark-bg text-dark-text p-6 select-none">
      <div className="max-w-md w-full bg-dark-card border border-red-500/20 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-5 shadow-inner">
          <FileQuestion size={32} className="stroke-[1.75]" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Arquivo Não Encontrado</h2>

        <p className="text-sm text-dark-subtext mb-4 leading-relaxed">
          Não foi possível carregar o arquivo PDF do livro{' '}
          <strong className="text-white">"{book.title}"</strong> no disco local nem na nuvem.
        </p>

        {book.file_path && (
          <div
            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-dark-subtext truncate text-left mb-5"
            title={book.file_path}
          >
            <span className="text-white/40 select-none mr-1.5">Caminho:</span>
            {book.file_path}
          </div>
        )}

        {reattachError && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 text-left mb-4">
            {reattachError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onReattach}
            disabled={isReattaching || isDeleting}
            className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            <FolderUp size={16} />
            {isReattaching ? 'Selecionando arquivo...' : 'Reanexar Arquivo PDF'}
          </button>

          <div className="flex gap-2 w-full">
            <button
              onClick={onReload}
              disabled={isReattaching || isDeleting}
              className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 active:scale-[0.99] text-dark-text text-sm font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Tentar Novamente
            </button>

            <button
              onClick={onBack}
              disabled={isReattaching || isDeleting}
              className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 active:scale-[0.99] text-dark-text text-sm font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Biblioteca
            </button>
          </div>

          <div className="border-t border-white/5 my-1" />

          {confirmDelete ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in">
              <span className="text-xs text-red-300 text-left">
                Deseja realmente excluir este livro e suas anotações da biblioteca?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onDeleteBook}
                  disabled={isDeleting}
                  className="flex-1 py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="flex-1 py-1.5 px-3 bg-white/10 hover:bg-white/15 text-white text-xs rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isReattaching || isDeleting}
              className="w-full py-2 px-3 text-xs text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} />
              Excluir registro da biblioteca
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
