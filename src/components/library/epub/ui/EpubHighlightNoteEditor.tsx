import { Sparkles, BookType } from 'lucide-react';

interface EpubHighlightNoteEditorProps {
  noteText: string;
  noteMode: string | null;
  noteAreaClass: string;
  textareaClass: string;
  onChangeNoteText: (text: string) => void;
  onCloseNote: () => void;
  onSaveNote: () => void;
  onOpenDictionaryFull: () => void;
}

export function EpubHighlightNoteEditor({
  noteText,
  noteMode,
  noteAreaClass,
  textareaClass,
  onChangeNoteText,
  onCloseNote,
  onSaveNote,
  onOpenDictionaryFull,
}: EpubHighlightNoteEditorProps) {
  if (!noteMode) return null;

  if (noteText.startsWith('<!-- AI_DICT -->')) {
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', ''));
    } catch {}

    const wc = parsedData?.english?.word_class || parsedData?.portuguese?.word_class;

    let defs: string[] = [];
    if (parsedData?.english?.definitions) defs = parsedData.english.definitions;
    else if (parsedData?.english?.definition) defs = [parsedData.english.definition];
    else if (parsedData?.definitions) defs = parsedData.definitions;
    else if (parsedData?.definition) defs = [parsedData.definition];
    else if (parsedData?.portuguese?.definitions) defs = parsedData.portuguese.definitions;
    else if (parsedData?.portuguese?.definition) defs = [parsedData.portuguese.definition];

    return (
      <div className={`mt-2 border-t pt-2 ${noteAreaClass}`}>
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-brand-500">
              <Sparkles size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider">IA Salva</span>
            </div>
            {wc && <span className="text-[10px] opacity-60 italic">{wc}</span>}
          </div>

          {defs.length > 0 && (
            <ul className="flex flex-col gap-0.5 pl-1">
              {defs.slice(0, 3).map((def, i) => (
                <li key={i} className="text-[11px] opacity-85 leading-snug flex gap-1">
                  {defs.length > 1 && <span className="opacity-40 shrink-0">{i + 1}.</span>}
                  <span>{def}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-between items-center mt-0.5">
            <button
              onClick={onCloseNote}
              className="px-2 py-1 text-[10px] font-medium opacity-60 hover:opacity-100 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={onOpenDictionaryFull}
              className="px-2.5 py-1 bg-brand-500 text-white rounded-lg text-[10px] font-bold hover:bg-brand-600 transition-colors flex items-center gap-1"
            >
              <BookType size={11} /> Ver completo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 mt-2 border-t pt-2 ${noteAreaClass}`}>
      <textarea
        value={noteText}
        onChange={e => onChangeNoteText(e.target.value)}
        placeholder="Escreva sua nota aqui..."
        className={`w-full text-xs p-2 border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 ${textareaClass}`}
        rows={3}
      />
      <div className="flex justify-end gap-1.5">
        <button
          onClick={onCloseNote}
          className="px-3 py-1.5 text-xs opacity-70 hover:opacity-100 rounded-lg hover:bg-current/10 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSaveNote}
          className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
