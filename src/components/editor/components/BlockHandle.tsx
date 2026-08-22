import { GripVertical, Trash2, Palette, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TEXT_COLORS, BG_COLORS } from '../../../utils/colors';

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
      className="block-handle fixed z-40 flex items-center justify-center cursor-pointer text-dark-subtext/40 hover:text-white transition-colors group"
      style={{ left: x, top: y }}
    >
      {/* Ponte invisível de hit-box para a direita conectando o handle ao texto sem gap morto */}
      <div className="absolute left-full top-0 w-6 h-full pointer-events-auto -z-10" />

      <div 
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded-md transition-all flex items-center justify-center cursor-grab active:cursor-grabbing ${
          isOpen
            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-md opacity-100'
            : 'hover:bg-white/10 hover:text-white text-dark-subtext/50 hover:opacity-100'
        }`}
        title="Opções do bloco (Clique para abrir opções ou arraste para mover)"
      >
        <GripVertical size={14} />
      </div>

      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute left-full top-0 ml-1 w-52 bg-dark-bg/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-fade-in z-50 py-1"
        >
          {!showColorSubmenu ? (
            <div className="py-0.5">
              {onMoveUp && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text hover:bg-white/10 hover:text-white transition-colors text-left"
                >
                  <ArrowUp size={13} className="text-dark-subtext" />
                  Subir bloco
                </button>
              )}

              {onMoveDown && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text hover:bg-white/10 hover:text-white transition-colors text-left"
                >
                  <ArrowDown size={13} className="text-dark-subtext" />
                  Descer bloco
                </button>
              )}

              {onAddBelow && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBelow();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text hover:bg-white/10 hover:text-white transition-colors text-left"
                >
                  <Plus size={13} className="text-dark-subtext" />
                  Adicionar linha abaixo
                </button>
              )}

              {(onMoveUp || onMoveDown || onAddBelow) && <div className="h-px bg-white/10 my-1 mx-2" />}

              {onChangeColor && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorSubmenu(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text hover:bg-white/10 hover:text-white transition-colors text-left"
                  >
                    <Palette size={13} className="text-dark-subtext" />
                    Cor e Realce
                  </button>

                  <div className="h-px bg-white/10 my-1 mx-2" />
                </>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
              >
                <Trash2 size={13} />
                Excluir bloco
              </button>
            </div>
          ) : (
            <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorSubmenu(false);
                }}
                className="text-xs text-brand-400 mb-2 hover:underline flex items-center gap-1"
              >
                &larr; Voltar
              </button>
              
              <div className="text-[10px] font-bold text-dark-subtext mb-2 px-1 uppercase tracking-wider">Cor do Texto</div>
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={(e) => {
                      e.stopPropagation();
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
              <div className="grid grid-cols-5 gap-1.5">
                {BG_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={(e) => {
                      e.stopPropagation();
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
