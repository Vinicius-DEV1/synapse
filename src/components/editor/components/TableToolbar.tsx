import { Editor } from '@tiptap/react';
import { Trash2, ArrowUpFromLine, ArrowDownFromLine, ArrowLeftFromLine, ArrowRightFromLine, X, Palette } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TableToolbarProps {
  editor: Editor;
}

const COLORS = [
  'transparent',
  'rgba(239, 68, 68, 0.2)', // Red
  'rgba(249, 115, 22, 0.2)', // Orange
  'rgba(234, 179, 8, 0.2)', // Yellow
  'rgba(34, 197, 94, 0.2)', // Green
  'rgba(59, 130, 246, 0.2)', // Blue
  'rgba(139, 92, 246, 0.2)', // Purple
  'rgba(236, 72, 153, 0.2)', // Pink
];

export default function TableToolbar({ editor }: TableToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColors) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColors]);

  const setColor = (c: string) => {
    const colorVal = c === 'transparent' ? null : c;
    editor.chain().focus().updateAttributes('tableCell', { backgroundColor: colorVal }).run();
    editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: colorVal }).run();
    setShowColors(false);
  };

  return (
    <div ref={toolbarRef} className="flex flex-col bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden animate-fade-in p-1 gap-1">
      <div className="flex items-center gap-1">
        <button onClick={() => editor.chain().focus().addRowBefore().run()} className="p-1.5 hover:bg-white/10 rounded text-dark-subtext hover:text-white transition-colors" title="Adicionar linha acima">
          <ArrowUpFromLine size={16} />
        </button>
        <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 hover:bg-white/10 rounded text-dark-subtext hover:text-white transition-colors" title="Adicionar linha abaixo">
          <ArrowDownFromLine size={16} />
        </button>
        <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors" title="Excluir linha">
          <Trash2 size={16} />
        </button>
        
        <div className="w-px h-5 bg-white/10 mx-1"></div>
        
        <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-1.5 hover:bg-white/10 rounded text-dark-subtext hover:text-white transition-colors" title="Adicionar coluna à esquerda">
          <ArrowLeftFromLine size={16} />
        </button>
        <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 hover:bg-white/10 rounded text-dark-subtext hover:text-white transition-colors" title="Adicionar coluna à direita">
          <ArrowRightFromLine size={16} />
        </button>
        <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors" title="Excluir coluna">
          <Trash2 size={16} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1"></div>

        <button onClick={() => setShowColors(!showColors)} className={`p-1.5 rounded transition-colors ${showColors ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-dark-subtext hover:text-white'}`} title="Cor da célula">
          <Palette size={16} />
        </button>
        
        <div className="w-px h-5 bg-white/10 mx-1"></div>

        <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 transition-colors" title="Excluir tabela inteira">
          <X size={16} />
        </button>
      </div>

      {showColors && (
        <div className="flex gap-1 p-1 bg-black/20 rounded border border-white/5 mt-1 justify-center">
          {COLORS.map(c => (
            <button 
               key={c}
               onClick={() => setColor(c)}
               className="w-6 h-6 rounded-md border border-white/10 transition-transform hover:scale-110 flex items-center justify-center relative overflow-hidden"
               style={{ backgroundColor: c === 'transparent' ? '#2a2a35' : c }}
               title={c === 'transparent' ? 'Remover cor' : ''}
            >
              {c === 'transparent' && <div className="absolute w-full h-[1px] bg-red-500/50 rotate-45"></div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
