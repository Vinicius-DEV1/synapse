import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';

interface TableColumnOptionsEditorProps {
  options: readonly string[];
  onOptionsChange: (options: string[]) => void;
}

/**
 * Tag-based editor for configuring options in a 'select' column.
 */
export default function TableColumnOptionsEditor({
  options,
  onOptionsChange,
}: TableColumnOptionsEditorProps) {
  const [newOptionText, setNewOptionText] = useState('');

  const handleAddOption = useCallback(() => {
    const trimmed = newOptionText.trim();
    if (!trimmed || options.includes(trimmed)) return;

    const updated = [...options, trimmed];
    onOptionsChange(updated);
    setNewOptionText('');
  }, [newOptionText, options, onOptionsChange]);

  const handleRemoveOption = useCallback(
    (optToRemove: string) => {
      const updated = options.filter((o) => o !== optToRemove);
      onOptionsChange(updated);
    },
    [options, onOptionsChange]
  );

  return (
    <div className="px-2.5 py-2">
      <span className="text-[10px] font-semibold text-dark-subtext uppercase tracking-wider mb-1.5 block">
        Opções
      </span>

      {/* Existing options badge list */}
      <div className="flex flex-wrap gap-1 mb-1.5 min-h-[20px]">
        {options.map((opt) => (
          <span
            key={opt}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[10px] font-medium"
          >
            {opt}
            <button
              type="button"
              onClick={() => handleRemoveOption(opt)}
              className="ml-0.5 text-brand-400/60 hover:text-rose-400 transition-colors"
              title={`Remover "${opt}"`}
            >
              <X size={9} />
            </button>
          </span>
        ))}
        {options.length === 0 && (
          <span className="text-[10px] text-dark-subtext/50 italic">
            Nenhuma opção definida
          </span>
        )}
      </div>

      {/* Add new option field */}
      <div className="flex gap-1">
        <input
          type="text"
          value={newOptionText}
          onChange={(e) => setNewOptionText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddOption();
            }
          }}
          placeholder="Nova opção…"
          className="flex-1 h-6 px-2 rounded-md bg-dark-surface border border-white/10 text-[11px] text-dark-text placeholder:text-dark-subtext/40 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 focus:outline-none transition-all"
        />
        <button
          type="button"
          onClick={handleAddOption}
          disabled={!newOptionText.trim()}
          className="h-6 px-1.5 rounded-md bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          title="Adicionar opção"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
