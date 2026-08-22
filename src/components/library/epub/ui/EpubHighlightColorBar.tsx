import { BookType, Trash2, X } from 'lucide-react';

interface EpubHighlightColorBarProps {
  noteMode: string | null;
  selection: any;
  dividerClass: string;
  confirmDelete: boolean;
  onSelectColor: (color: string) => void;
  onCopyText: () => void;
  onOpenDictionary: () => void;
  onOpenNote: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
}

export function EpubHighlightColorBar({
  noteMode,
  selection,
  dividerClass,
  confirmDelete,
  onSelectColor,
  onCopyText,
  onOpenDictionary,
  onOpenNote,
  onConfirmDelete,
  onRequestDelete,
  onCancelDelete,
}: EpubHighlightColorBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelectColor('yellow')}
          className={`w-7 h-7 rounded-full bg-yellow-400 hover:scale-110 active:scale-95 transition-transform shadow-sm ${
            noteMode === 'yellow' || (!noteMode && selection.existingHighlightId) ? 'ring-2 ring-offset-2 ring-yellow-500' : ''
          }`}
        />
        <button
          onClick={() => onSelectColor('green')}
          className={`w-7 h-7 rounded-full bg-green-400 hover:scale-110 active:scale-95 transition-transform shadow-sm ${
            noteMode === 'green' ? 'ring-2 ring-offset-2 ring-green-500' : ''
          }`}
        />
        <button
          onClick={() => onSelectColor('blue')}
          className={`w-7 h-7 rounded-full bg-blue-400 hover:scale-110 active:scale-95 transition-transform shadow-sm ${
            noteMode === 'blue' ? 'ring-2 ring-offset-2 ring-blue-500' : ''
          }`}
        />
        <button
          onClick={() => onSelectColor('pink')}
          className={`w-7 h-7 rounded-full bg-pink-400 hover:scale-110 active:scale-95 transition-transform shadow-sm ${
            noteMode === 'pink' ? 'ring-2 ring-offset-2 ring-pink-500' : ''
          }`}
        />
      </div>

      {!noteMode && (
        <div className="flex items-center gap-1">
          <div className={`w-px h-5 mx-1 ${dividerClass}`} />
          {/* Copiar */}
          <button
            onClick={onCopyText}
            className="text-2xl opacity-70 hover:opacity-100 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            title="Copiar texto"
          >
            📋
          </button>

          {/* Dicionário */}
          {(!selection.existingHighlightId || selection.text) && (
            <button
              onClick={onOpenDictionary}
              className="opacity-70 hover:opacity-100 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              title="Dicionário / Traduzir"
            >
              <BookType size={22} />
            </button>
          )}

          {/* Note (only for new highlights) */}
          {!selection.existingHighlightId && (
            <button
              onClick={onOpenNote}
              className="text-sm font-medium opacity-70 hover:opacity-100 px-2 py-1 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1.5"
            >
              <span className="text-2xl">📝</span> Nota
            </button>
          )}

          {/* Lixeira (grifos existentes) */}
          {selection.existingHighlightId && (
            confirmDelete ? (
              <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-1 animate-fade-in">
                <button
                  onClick={onConfirmDelete}
                  className="text-red-500 text-xs font-bold px-2 py-1.5 hover:bg-red-500/20 rounded-md transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={onCancelDelete}
                  className="text-dark-subtext px-1.5 py-1.5 hover:bg-black/10 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={onRequestDelete}
                className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                title="Excluir Grifo"
              >
                <Trash2 size={22} />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
