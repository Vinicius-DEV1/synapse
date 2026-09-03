import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  EyeOff,
  Palette,
  Highlighter,
  RemoveFormatting,
  Columns2,
  Rows2,
  Grid,
  PaintBucket,
  Trash2,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  X,
  Combine,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import TableColorPopover, { type ColorPopoverMode } from './table/TableColorPopover';
import {
  getSelectionScope,
  selectCurrentColumn,
  selectCurrentRow,
  selectEntireTable,
  applyFormatToTableSelection,
} from './table/tableSelectionUtils';

interface TableToolbarProps {
  editor: Editor;
}

export default function TableToolbar({ editor }: TableToolbarProps) {
  const [activeColorMode, setActiveColorMode] = useState<ColorPopoverMode | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeColorMode) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveColorMode(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeColorMode]);

  const handleFormat = useCallback(
    (command: string, value?: string) => {
      applyFormatToTableSelection(editor, command, value);
    },
    [editor]
  );

  const scope = getSelectionScope(editor);

  const activeClass = 'bg-white/10 text-brand-400 shadow-sm';
  const inactiveClass = 'text-dark-subtext hover:bg-white/10 hover:text-white';

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isUnderline = editor.isActive('underline');
  const isStrike = editor.isActive('strike');
  const isCode = editor.isActive('code');
  const isSpoiler = editor.isActive('spoiler');
  const isHighlight = editor.isActive('highlight');

  return (
    <div
      ref={toolbarRef}
      className="relative flex items-center flex-wrap gap-0.5 bg-dark-bg/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1 animate-fade-in text-xs select-none"
    >
      {/* 1. Text Formatting Controls */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => handleFormat('bold')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${isBold ? activeClass : inactiveClass}`}
          title="Negrito (Ctrl+B)"
        >
          <Bold size={15} />
        </button>

        <button
          type="button"
          onClick={() => handleFormat('italic')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${isItalic ? activeClass : inactiveClass}`}
          title="Itálico (Ctrl+I)"
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          onClick={() => handleFormat('underline')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${isUnderline ? activeClass : inactiveClass}`}
          title="Sublinhado (Ctrl+U)"
        >
          <Underline size={15} />
        </button>

        <button
          type="button"
          onClick={() => handleFormat('strike')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${isStrike ? activeClass : inactiveClass}`}
          title="Tachado"
        >
          <Strikethrough size={15} />
        </button>

        <button
          type="button"
          onClick={() => handleFormat('code')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${isCode ? activeClass : inactiveClass}`}
          title="Código inline"
        >
          <Code size={15} />
        </button>

        <button
          type="button"
          onClick={() => handleFormat('spoiler')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${isSpoiler ? activeClass : inactiveClass}`}
          title="Ocultar com Fumaça / Spoiler (Ctrl+Shift+S)"
        >
          <EyeOff size={15} />
        </button>

        <button
          type="button"
          onClick={() => setActiveColorMode(activeColorMode === 'textColor' ? null : 'textColor')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${activeColorMode === 'textColor' ? activeClass : inactiveClass}`}
          title="Cor do Texto"
        >
          <Palette size={15} />
        </button>

        <button
          type="button"
          onClick={() => setActiveColorMode(activeColorMode === 'highlight' ? null : 'highlight')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${isHighlight || activeColorMode === 'highlight' ? activeClass : inactiveClass}`}
          title="Destaque do Texto"
        >
          <Highlighter size={15} />
        </button>

        <button
          type="button"
          onClick={() => handleFormat('clearFormatting')}
          className="p-1.5 rounded-lg transition-all text-dark-subtext hover:bg-white/10 hover:text-white active:scale-90"
          title="Limpar Formatação"
        >
          <RemoveFormatting size={15} />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* 2. Excel Selection Controls (Strategic Row/Column selectors) */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => selectCurrentColumn(editor)}
          className={`flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all text-[11px] font-medium active:scale-95 ${
            scope.type === 'col' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : inactiveClass
          }`}
          title="Selecionar Coluna (Excel)"
        >
          <Columns2 size={14} />
          <span className="hidden sm:inline">Coluna</span>
        </button>

        <button
          type="button"
          onClick={() => selectCurrentRow(editor)}
          className={`flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all text-[11px] font-medium active:scale-95 ${
            scope.type === 'row' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : inactiveClass
          }`}
          title="Selecionar Linha (Excel)"
        >
          <Rows2 size={14} />
          <span className="hidden sm:inline">Linha</span>
        </button>

        <button
          type="button"
          onClick={() => selectEntireTable(editor)}
          className={`p-1.5 rounded-lg transition-all active:scale-95 ${
            scope.type === 'table' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : inactiveClass
          }`}
          title="Selecionar Tabela Inteira (Excel)"
        >
          <Grid size={14} />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* 3. Table Structure & Cell Background Operations */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setActiveColorMode(activeColorMode === 'cellBg' ? null : 'cellBg')}
          className={`p-1.5 rounded-lg transition-all active:scale-90 ${activeColorMode === 'cellBg' ? activeClass : inactiveClass}`}
          title="Cor da célula"
        >
          <PaintBucket size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="p-1.5 hover:bg-white/10 rounded-lg text-dark-subtext hover:text-white transition-all active:scale-90"
          title="Adicionar linha acima"
        >
          <ArrowUpFromLine size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="p-1.5 hover:bg-white/10 rounded-lg text-dark-subtext hover:text-white transition-all active:scale-90"
          title="Adicionar linha abaixo"
        >
          <ArrowDownFromLine size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all active:scale-90"
          title="Excluir linha"
        >
          <Trash2 size={15} />
        </button>

        <div className="w-px h-4 bg-white/5 mx-0.5" />

        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          className="p-1.5 hover:bg-white/10 rounded-lg text-dark-subtext hover:text-white transition-all active:scale-90"
          title="Adicionar coluna à esquerda"
        >
          <ArrowLeftFromLine size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="p-1.5 hover:bg-white/10 rounded-lg text-dark-subtext hover:text-white transition-all active:scale-90"
          title="Adicionar coluna à direita"
        >
          <ArrowRightFromLine size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all active:scale-90"
          title="Excluir coluna"
        >
          <Trash2 size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().mergeOrSplit().run()}
          className="p-1.5 hover:bg-white/10 rounded-lg text-dark-subtext hover:text-white transition-all active:scale-90"
          title="Mesclar ou Dividir Células"
        >
          <Combine size={15} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-0.5" />

        <button
          type="button"
          onClick={() => editor.chain().focus().deleteTable().run()}
          className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-500 hover:text-red-400 transition-all active:scale-90"
          title="Excluir tabela inteira"
        >
          <X size={15} />
        </button>
      </div>

      {/* Active Color Popover (Text Color, Highlight, Cell Background) */}
      {activeColorMode && (
        <TableColorPopover
          mode={activeColorMode}
          onSelectColor={(c) => {
            if (activeColorMode === 'textColor') {
              handleFormat('color', c);
            } else if (activeColorMode === 'highlight') {
              handleFormat('highlight', c);
            } else if (activeColorMode === 'cellBg') {
              handleFormat('backgroundColor', c);
            }
          }}
          onClose={() => setActiveColorMode(null)}
        />
      )}
    </div>
  );
}
