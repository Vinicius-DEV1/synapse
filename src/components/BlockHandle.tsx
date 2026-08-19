import { GripVertical, Trash2, Palette, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TEXT_COLORS, BG_COLORS } from '../utils/colors';

interface BlockHandleProps {
  x: number;
  y: number;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBelow?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onChangeColor?: (color: string, isBackground: boolean) => void;
  /** Avisa quem posiciona a alça que ela não pode sumir agora. */
  onMenuOpenChange?: (open: boolean) => void;
}

export default function BlockHandle({
  x,
  y,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onDragStart,
  onDragEnd,
  onChangeColor,
  onMenuOpenChange,
}: BlockHandleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mantém a alça visível e ancorada enquanto o menu de opções estiver aberto
  useEffect(() => {
    onMenuOpenChange?.(isOpen);
  }, [isOpen, onMenuOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowColorSubmenu(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      className="block-handle fixed z-40 flex flex-col items-center justify-center cursor-pointer text-dark-subtext/40 hover:text-dark-subtext transition-colors group"
      style={{ left: x, top: y - 10 }}
    >
      {onMoveUp && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 hover:text-white transition-all text-dark-subtext"
          title="Subir bloco (Mover para cima)"
        >
          <ArrowUp size={11} />
        </button>
      )}

      {onAddBelow && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddBelow();
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 hover:text-white transition-all text-dark-subtext"
          title="Adicionar linha abaixo (+)"
        >
          <Plus size={11} />
        </button>
      )}

      <div 
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 rounded hover:bg-white/10"
        title="Opções do bloco (Arraste para mover ou clique para opções)"
      >
        <GripVertical size={16} />
      </div>

      {onMoveDown && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 hover:text-white transition-all text-dark-subtext"
          title="Descer bloco (Mover para baixo)"
        >
          <ArrowDown size={11} />
        </button>
      )}

      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute left-full top-0 ml-1 w-48 bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden animate-fade-in"
        >
          {!showColorSubmenu ? (
            <div className="py-1">
              {onMoveUp && (
                <button
                  onClick={() => {
                    onMoveUp();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/5 transition-colors text-left"
                >
                  <ArrowUp size={14} />
                  Subir bloco
                </button>
              )}

              {onMoveDown && (
                <button
                  onClick={() => {
                    onMoveDown();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/5 transition-colors text-left"
                >
                  <ArrowDown size={14} />
                  Descer bloco
                </button>
              )}

              {(onMoveUp || onMoveDown) && <div className="h-px bg-white/10 my-1 mx-2" />}

              {onChangeColor && (
                <>
                  <button
                    onClick={() => setShowColorSubmenu(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/5 transition-colors text-left"
                  >
                    <Palette size={14} />
                    Cor do bloco
                  </button>

                  <div className="h-px bg-white/10 my-1 mx-2" />
                </>
              )}

              <button
                onClick={() => {
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors text-left"
              >
                <Trash2 size={14} />
                Excluir bloco
              </button>
            </div>
          ) : (
            <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
              <button 
                onClick={() => setShowColorSubmenu(false)}
                className="text-xs text-brand-400 mb-2 hover:underline"
              >
                &larr; Voltar
              </button>
              
              <div className="text-[10px] font-bold text-dark-subtext mb-2 px-1 uppercase tracking-wider">Cor do Texto</div>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => {
                      onChangeColor?.(c.value, false);
                      setIsOpen(false);
                      setShowColorSubmenu(false);
                    }}
                    className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: c.value === 'inherit' ? '#333' : c.hex, color: '#fff' }}
                    title={c.name}
                  >
                    {c.value === 'inherit' ? 'A' : ''}
                  </button>
                ))}
              </div>
              
              <div className="text-[10px] font-bold text-dark-subtext mb-2 px-1 uppercase tracking-wider">Cor de Fundo</div>
              <div className="grid grid-cols-5 gap-2">
                {BG_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => {
                      onChangeColor?.(c.value, true);
                      setIsOpen(false);
                      setShowColorSubmenu(false);
                    }}
                    className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: c.value === 'transparent' ? '#333' : c.value, color: c.hex === 'transparent' ? '#fff' : c.hex }}
                    title={c.name}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
